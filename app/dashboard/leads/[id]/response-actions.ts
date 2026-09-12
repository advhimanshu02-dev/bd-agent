'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod/v3'

const ClassificationSchema = z.object({
  classification: z.enum(['INTERESTED', 'NOT_INTERESTED', 'NEEDS_MORE_INFO', 'OBJECTION', 'REQUESTING_MEETING']),
  suggested_next_step: z.string(),
})

const MODEL = 'gpt-4o-mini'
const INPUT_RATE_PER_MILLION = 0.15
const OUTPUT_RATE_PER_MILLION = 0.60

// Maps AI response classification to the new ORION pipeline stage.
// Every mapping requires actual evidence from the response — never an assumed jump.
const STATUS_MAP: Record<string, string> = {
  INTERESTED: 'INTERESTED',
  REQUESTING_MEETING: 'MEETING',
  NOT_INTERESTED: 'LOST',
  NEEDS_MORE_INFO: 'RESPONSE_RECEIVED',
  OBJECTION: 'RESPONSE_RECEIVED',
}

export async function logResponse(leadId: string, responseText: string) {
  if (!responseText.trim()) {
    return { error: 'Response text cannot be empty.' }
  }

  const supabase = await createClient()

  const { data: lead } = await supabase.from('leads').select('id, status').eq('id', leadId).single()
  if (!lead) {
    return { error: 'Lead not found in your account.' }
  }

  await supabase.from('activities').insert({
    lead_id: leadId,
    activity_type: 'RESPONSE_RECEIVED',
    description: responseText,
  })

  if (!process.env.OPENAI_API_KEY) {
    revalidatePath(`/dashboard/leads/${leadId}`)
    return { success: true, warning: 'Response logged, but classification skipped: OPENAI_API_KEY not configured.' }
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const prompt = `
Classify this prospect's response to a business development outreach message from a legal recovery services firm.

Response text: "${responseText}"

Classify as exactly one of: INTERESTED, NOT_INTERESTED, NEEDS_MORE_INFO, OBJECTION, REQUESTING_MEETING.
Also give one concise, concrete suggested next step for the salesperson.
`.trim()

  let response
  try {
    response = await openai.responses.parse({
      model: MODEL,
      input: prompt,
      text: { format: zodTextFormat(ClassificationSchema, 'classification') },
    })
  } catch (err: any) {
    revalidatePath(`/dashboard/leads/${leadId}`)
    return { success: true, warning: `Response logged, but classification failed: ${err?.message ?? 'unknown error'}` }
  }

  const parsed = response.output_parsed
  if (!parsed) {
    revalidatePath(`/dashboard/leads/${leadId}`)
    return { success: true, warning: 'Response logged, but classification returned no result.' }
  }

  const newStatus = STATUS_MAP[parsed.classification] ?? null
  const interested = parsed.classification === 'INTERESTED' || parsed.classification === 'REQUESTING_MEETING'
    ? true
    : parsed.classification === 'NOT_INTERESTED'
    ? false
    : null

  if (newStatus) {
    await supabase
      .from('leads')
      .update({
        status: newStatus,
        ...(interested !== null ? { interested } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)

    await supabase.from('activities').insert({
      lead_id: leadId,
      activity_type: 'STATUS_CHANGE',
      description: `Status changed to ${newStatus} based on response classification (${parsed.classification}).`,
    })
  }

  const inputTokens = response.usage?.input_tokens ?? 0
  const outputTokens = response.usage?.output_tokens ?? 0
  const estimatedCost =
    (inputTokens / 1_000_000) * INPUT_RATE_PER_MILLION + (outputTokens / 1_000_000) * OUTPUT_RATE_PER_MILLION

  await supabase.from('ai_usage').insert({
    lead_id: leadId,
    operation: 'RESPONSE_CLASSIFICATION',
    model: MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: estimatedCost,
  })

  revalidatePath(`/dashboard/leads/${leadId}`)

  return {
    success: true,
    classification: parsed.classification,
    suggestedNextStep: parsed.suggested_next_step,
    newStatus,
  }
}