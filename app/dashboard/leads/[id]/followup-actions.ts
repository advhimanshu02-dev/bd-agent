'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod/v3'

const FollowUpSchema = z.object({
  subject_line: z.string(),
  body: z.string(),
})

const MODEL = 'gpt-4o-mini'
const INPUT_RATE_PER_MILLION = 0.15
const OUTPUT_RATE_PER_MILLION = 0.60

export async function generateFollowUp(leadId: string) {
  const supabase = await createClient()

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*, company:companies(*), contact:contacts(*)')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    return { error: 'Lead not found in your account.' }
  }

  if (lead.contact?.do_not_contact) {
    return { error: 'This contact is marked Do Not Contact. Follow-up cannot be prepared for them.' }
  }

  if (!process.env.OPENAI_API_KEY) {
    return { error: 'OPENAI_API_KEY is not configured on the server.' }
  }

  const { data: recentActivities } = await supabase
    .from('activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(10)

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const activityText = (recentActivities ?? [])
    .map((a) => `[${a.activity_type}] ${a.description}`)
    .join('\n')

  const prompt = `
You are drafting a short, polite follow-up email for a business development contact at ${lead.company?.name ?? 'a company'} (contact: ${lead.contact?.name ?? 'unknown'}).

This is a FOLLOW-UP to a previous outreach message, not a first contact — keep it brief (3-5 sentences), warm, and reference the original message without repeating its full content.

Original outreach draft (for context, do not repeat verbatim):
${lead.personalization_points ?? '(no original draft on file)'}

Recent activity log for context (most recent first):
${activityText || '(no recent activity logged)'}

Write a short follow-up subject line and body. Never invent facts not present in the context above.
`.trim()

  let response
  try {
    response = await openai.responses.parse({
      model: MODEL,
      input: prompt,
      text: { format: zodTextFormat(FollowUpSchema, 'followup') },
    })
  } catch (err: any) {
    return { error: `Follow-up generation failed: ${err?.message ?? 'unknown error'}` }
  }

  const parsed = response.output_parsed
  if (!parsed) {
    return { error: 'The AI did not return a usable follow-up.' }
  }

  const combined = `Subject: ${parsed.subject_line}\n\n${parsed.body}`

  const { error: updateError } = await supabase
    .from('leads')
    .update({ personalization_points: combined, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (updateError) return { error: `Follow-up could not be saved: ${updateError.message}` }

  const inputTokens = response.usage?.input_tokens ?? 0
  const outputTokens = response.usage?.output_tokens ?? 0
  const estimatedCost =
    (inputTokens / 1_000_000) * INPUT_RATE_PER_MILLION + (outputTokens / 1_000_000) * OUTPUT_RATE_PER_MILLION

  await supabase.from('ai_usage').insert({
    lead_id: leadId,
    operation: 'FOLLOWUP_DRAFT',
    model: MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: estimatedCost,
  })

  await supabase.from('activities').insert({
    lead_id: leadId,
    activity_type: 'MESSAGE_DRAFTED',
    description: `Drafted follow-up message: "${parsed.subject_line}"`,
  })

  revalidatePath(`/dashboard/leads/${leadId}`)
  revalidatePath('/dashboard/outreach')

  return { success: true, subject: parsed.subject_line, body: parsed.body }
}