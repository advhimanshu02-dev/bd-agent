'use server'

import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod/v3'

const CandidateSchema = z.object({
  name: z.string(),
  designation: z.string(),
  source: z.string().nullable(),
})

const CandidatesSchema = z.object({
  candidates: z.array(CandidateSchema),
})

const MODEL = 'gpt-4o-mini'
const INPUT_RATE_PER_MILLION = 0.15
const OUTPUT_RATE_PER_MILLION = 0.60
const WEB_SEARCH_RATE_PER_CALL = 0.01

export async function findContacts(companyId: string) {
  const supabase = await createClient()

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (companyError || !company) {
    return { error: 'Company not found in your account.' }
  }

  if (!process.env.OPENAI_API_KEY) {
    return { error: 'OPENAI_API_KEY is not configured on the server.' }
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const prompt = `
Search the public web (company website, press releases, news articles — NEVER LinkedIn directly) for people who currently appear to hold roles such as: Legal Head, Legal Manager, Head of Legal, Head of Collections, Collections Manager, Recovery Head, Head of Recovery, or similar legal/collections/recovery leadership roles at the company "${company.name}".

Only include a candidate if you found them via an actual search result with a real URL. Never invent a name, title, or URL. If you find nothing reliable, return an empty list.

For each candidate found, return their name, their apparent designation/title as stated in the source, and the exact source URL.
`.trim()

  let response
  try {
    response = await openai.responses.parse({
      model: MODEL,
      input: prompt,
      tools: [{ type: 'web_search' }],
      text: { format: zodTextFormat(CandidatesSchema, 'candidates') },
    })
  } catch (err: any) {
    return { error: `Contact search failed: ${err?.message ?? 'unknown error'}` }
  }

  const parsed = response.output_parsed
  if (!parsed) {
    return { error: 'The AI did not return usable results.' }
  }

  // Server-side validation: never trust a candidate without a real source URL
  const validCandidates = parsed.candidates.filter(
    (c) => typeof c.source === 'string' && /^https?:\/\//.test(c.source) && c.name.trim() && c.designation.trim()
  )

  const inputTokens = response.usage?.input_tokens ?? 0
  const outputTokens = response.usage?.output_tokens ?? 0
  const webSearchCalls = (response.output ?? []).filter((item: any) => item.type === 'web_search_call').length
  const estimatedCost =
    (inputTokens / 1_000_000) * INPUT_RATE_PER_MILLION +
    (outputTokens / 1_000_000) * OUTPUT_RATE_PER_MILLION +
    webSearchCalls * WEB_SEARCH_RATE_PER_CALL

  await supabase.from('ai_usage').insert({
    operation: 'CONTACT_SEARCH',
    model: MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: estimatedCost,
  })

  return { success: true, candidates: validCandidates, cost: estimatedCost }
}

export async function addSuggestedContact(
  companyId: string,
  name: string,
  designation: string,
  source: string
) {
  const supabase = await createClient()

  const { data: company } = await supabase.from('companies').select('id').eq('id', companyId).single()
  if (!company) {
    return { error: 'Company not found in your account.' }
  }

  const { data: existingContacts } = await supabase
    .from('contacts')
    .select('id, name')
    .eq('company_id', companyId)

  const normalized = name.trim().toLowerCase()
  const isDuplicate = (existingContacts ?? []).some((c) => c.name.trim().toLowerCase() === normalized)
  if (isDuplicate) {
    return { error: `A contact named "${name}" already exists for this company.` }
  }

  const { error } = await supabase.from('contacts').insert({
    company_id: companyId,
    name,
    designation,
    data_source: source,
    verification_status: 'REQUIRES_VERIFICATION',
  })

  if (error) {
    console.error('addSuggestedContact error:', error)
    return { error: 'Could not save the contact. Please try again.' }
  }
  return { success: true }
}