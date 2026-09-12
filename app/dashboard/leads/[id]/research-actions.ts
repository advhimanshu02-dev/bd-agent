'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod/v3'

const FindingSchema = z.object({
  finding_type: z.enum(['FACT', 'INFERENCE', 'UNKNOWN']),
  content: z.string(),
  source: z.string().nullable(),
})

const ResearchOutputSchema = z.object({
  findings: z.array(FindingSchema),
})

const MODEL = 'gpt-5.6-terra'
const INPUT_RATE_PER_MILLION = 2
const OUTPUT_RATE_PER_MILLION = 12
const WEB_SEARCH_RATE_PER_CALL = 0.01

export async function researchLead(leadId: string, force: boolean = false) {
  const supabase = await createClient()

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*, company:companies(*), contact:contacts(*)')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    return { error: 'Lead not found in your account.' }
  }

  if (!force) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('research_findings')
      .select('id')
      .eq('lead_id', leadId)
      .gte('created_at', sevenDaysAgo)
      .limit(1)

    if (recent && recent.length > 0) {
      return { needsConfirmation: true }
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return { error: 'OPENAI_API_KEY is not configured on the server. Add it to .env.local and restart the dev server.' }
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const companyName = lead.company?.name ?? 'Unknown company'
  const companyWebsite = lead.company?.website ?? 'not provided'
  const contactName = lead.contact?.name ?? 'Unknown contact'
  const contactDesignation = lead.contact?.designation ?? 'not provided'

  const prompt = `
You are a business development research assistant for a legal services firm serving banks, NBFCs, and fintech lenders in India. The firm offers: legal notice management, notice generation and dispatch, recovery legal support, advocate-led case filing, litigation support, recovery operations, and legal recovery call-centre support.

Research the following company and contact using web search. Base every finding STRICTLY on what your searches actually return — never invent facts, URLs, or details.

Company: ${companyName}
Company website: ${companyWebsite}
Contact: ${contactName}
Contact designation: ${contactDesignation}

Look for:
- Company business/lending profile
- Recent relevant developments (news, announcements)
- Recovery/collections developments
- Litigation/legal developments
- Digital/technology initiatives
- Expansion/hiring where commercially relevant
- Potential legal/recovery operational pain points
- Anything relevant to the firm's services above
- The contact's current designation, department, and public professional background, and whether they appear relevant to this BD objective

Return a list of findings. For each finding:
- finding_type: "FACT" if directly supported by a specific source you found (include its exact URL in "source"), "INFERENCE" if it's your interpretation based on one or more facts (say so in the content, and still include supporting source URL(s) if available), or "UNKNOWN" if it could not be established (in which case content should say "REQUIRES VERIFICATION" and explain what's missing).
- Never fabricate a source URL. If you have no real URL, source must be null.
`.trim()

  let response
  try {
    response = await openai.responses.parse({
      model: MODEL,
      input: prompt,
      tools: [{ type: 'web_search' }],
      text: { format: zodTextFormat(ResearchOutputSchema, 'research_output') },
    })
  } catch (err: any) {
    return { error: `AI research request failed: ${err?.message ?? 'unknown error'}` }
  }

  const parsed = response.output_parsed
  if (!parsed || !Array.isArray(parsed.findings) || parsed.findings.length === 0) {
    return { error: 'The AI did not return any usable findings. Nothing was saved.' }
  }

  const validatedFindings = parsed.findings
    .map((f) => {
      const hasValidSource = typeof f.source === 'string' && /^https?:\/\//.test(f.source)
      if (f.finding_type === 'FACT' && !hasValidSource) {
        return { ...f, finding_type: 'UNKNOWN' as const, source: null }
      }
      if (!hasValidSource) {
        return { ...f, source: null }
      }
      return f
    })
    .filter((f) => f.content && f.content.trim().length > 0)

  if (validatedFindings.length === 0) {
    return { error: 'No valid findings survived source validation. Nothing was saved.' }
  }

  const rows = validatedFindings.map((f) => ({
    lead_id: leadId,
    finding_type: f.finding_type,
    content: f.content,
    source: f.source,
  }))

  const { error: insertError } = await supabase.from('research_findings').insert(rows)
  if (insertError) {
    return { error: `Findings could not be saved: ${insertError.message}` }
  }

  const inputTokens = response.usage?.input_tokens ?? 0
  const outputTokens = response.usage?.output_tokens ?? 0
  const webSearchCalls = (response.output ?? []).filter((item: any) => item.type === 'web_search_call').length

  const estimatedCost =
    (inputTokens / 1_000_000) * INPUT_RATE_PER_MILLION +
    (outputTokens / 1_000_000) * OUTPUT_RATE_PER_MILLION +
    webSearchCalls * WEB_SEARCH_RATE_PER_CALL

  await supabase.from('ai_usage').insert({
    lead_id: leadId,
    operation: 'RESEARCH',
    model: MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: estimatedCost,
  })

  revalidatePath(`/dashboard/leads/${leadId}`)
  return { success: true, count: validatedFindings.length, cost: estimatedCost }
}