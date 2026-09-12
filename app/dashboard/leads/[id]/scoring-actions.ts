'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod/v3'

const ScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  tier: z.enum(['HOT', 'WARM', 'COLD']),
  summary_reason: z.string(),
  key_reasons: z.array(z.string()).min(2).max(4),
  recommended_actions: z.array(z.string()).min(2).max(3),
})

const MODEL = 'gpt-4o-mini'
const INPUT_RATE_PER_MILLION = 0.15
const OUTPUT_RATE_PER_MILLION = 0.60

function tierFromScore(score: number): 'HOT' | 'WARM' | 'COLD' {
  if (score >= 80) return 'HOT'
  if (score >= 50) return 'WARM'
  return 'COLD'
}

export async function scoreLead(leadId: string) {
  const supabase = await createClient()

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*, company:companies(*), contact:contacts(*)')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    return { error: 'Lead not found in your account.' }
  }

  const { data: findings } = await supabase
    .from('research_findings')
    .select('*')
    .eq('lead_id', leadId)

  if (!findings || findings.length === 0) {
    return { error: 'No AI research findings found. Run AI Research before scoring.' }
  }

  if (!process.env.OPENAI_API_KEY) {
    return { error: 'OPENAI_API_KEY is not configured on the server.' }
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const findingsText = findings
    .map((f) => `[${f.finding_type}] ${f.content}${f.source ? ` (source: ${f.source})` : ''}`)
    .join('\n')

  const prompt = `
You are scoring a business development lead for a legal services firm serving banks, NBFCs, and fintech lenders in India. The firm offers: legal notice management, notice generation and dispatch, recovery legal support, advocate-led case filing, litigation support, recovery operations, and legal recovery call-centre support.

Lead: ${lead.contact?.name ?? 'Unknown'} (${lead.contact?.designation ?? 'unknown designation'}) at ${lead.company?.name ?? 'Unknown company'}.

Research findings collected so far (base your scoring ONLY on this evidence, never invent anything beyond it):
${findingsText}

Score this lead from 0-100 based on: how relevant the company's business is to the firm's services, how much decision-making authority the contact appears to have, and how strong the evidence is (FACTs weigh more than INFERENCEs; UNKNOWN findings should not inflate the score).

Provide: an overall score (0-100), a tier ("HOT" for 80-100, "WARM" for 50-79, "COLD" for 0-49 — must match your score), a one-sentence summary reason, 2-4 concise key reasons, and 2-3 concrete recommended next actions for outreach.
`.trim()

  let response
  try {
    response = await openai.responses.parse({
      model: MODEL,
      input: prompt,
      text: { format: zodTextFormat(ScoreSchema, 'lead_score') },
    })
  } catch (err: any) {
    return { error: `Scoring unavailable: ${err?.message ?? 'Check OpenAI account balance or API key.'}` }
  }

  const parsed = response.output_parsed
  if (!parsed) {
    return { error: 'The AI did not return a usable score. Nothing was saved.' }
  }

  // Never trust the model's tier label blindly — recompute it from the score ourselves
  const tier = tierFromScore(parsed.score)

  const formattedReason = [
    parsed.summary_reason,
    '',
    'Key reasons:',
    ...parsed.key_reasons.map((r) => `- ${r}`),
    '',
    'Recommended actions:',
    ...parsed.recommended_actions.map((a) => `- ${a}`),
  ].join('\n')

  const { error: updateError } = await supabase
    .from('leads')
    .update({
      lead_score: parsed.score,
      priority: tier,
      score_reason: formattedReason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (updateError) {
    return { error: `Score could not be saved: ${updateError.message}` }
  }

  const inputTokens = response.usage?.input_tokens ?? 0
  const outputTokens = response.usage?.output_tokens ?? 0
  const estimatedCost =
    (inputTokens / 1_000_000) * INPUT_RATE_PER_MILLION +
    (outputTokens / 1_000_000) * OUTPUT_RATE_PER_MILLION

  await supabase.from('ai_usage').insert({
    lead_id: leadId,
    operation: 'SCORING',
    model: MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: estimatedCost,
  })

  await supabase.from('activities').insert({
    lead_id: leadId,
    activity_type: 'LEAD_SCORED',
    description: `Scored lead as ${tier} (Score: ${parsed.score}/100)`,
  })

  revalidatePath(`/dashboard/leads/${leadId}`)

  return {
    success: true,
    score: parsed.score,
    tier,
    summary_reason: parsed.summary_reason,
    key_reasons: parsed.key_reasons,
    recommended_actions: parsed.recommended_actions,
  }
}