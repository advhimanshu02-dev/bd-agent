'use server'

import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod/v3'

const CandidateSchema = z.object({
  name: z.string(),
  company_type: z.string(),
  industry: z.string().nullable(),
  reason: z.string(),
  source: z.string().nullable(),
})

const CandidatesSchema = z.object({
  candidates: z.array(CandidateSchema),
})

const MODEL = 'gpt-4o-mini'
const INPUT_RATE_PER_MILLION = 0.15
const OUTPUT_RATE_PER_MILLION = 0.60
const WEB_SEARCH_RATE_PER_CALL = 0.01

export async function discoverCompanies(brief: string) {
  if (!brief.trim()) {
    return { error: 'Please describe what kind of companies to look for.' }
  }

  const supabase = await createClient()

  if (!process.env.OPENAI_API_KEY) {
    return { error: 'OPENAI_API_KEY is not configured on the server.' }
  }

  const { data: existing } = await supabase.from('companies').select('name')
  const existingNames = new Set((existing ?? []).map((c) => c.name.trim().toLowerCase()))

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const prompt = `
You are helping a legal recovery services firm find new B2B prospects. The firm serves Banks, NBFCs, FinTech lenders, housing finance companies, and similar lending institutions in India, offering legal notice management, recovery legal support, litigation support, and legal recovery call-centre services.

Search the public web for real companies matching this brief: "${brief}"

Only include a company if you found it via an actual search result. Never invent a company name. For each one, give: company name, company type (e.g. "NBFC", "Private Sector Bank", "Housing Finance Company"), industry, a one-sentence reason it could be a relevant BD target (based only on what you found), and the source URL where you found this information. If you cannot find a real source for a company, do not include it.
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
    return { error: `Company discovery failed: ${err?.message ?? 'unknown error'}` }
  }

  const parsed = response.output_parsed
  if (!parsed) {
    return { error: 'The AI did not return usable results.' }
  }

  const validCandidates = parsed.candidates.filter(
    (c) =>
      typeof c.source === 'string' &&
      /^https?:\/\//.test(c.source) &&
      c.name.trim() &&
      !existingNames.has(c.name.trim().toLowerCase())
  )

  const inputTokens = response.usage?.input_tokens ?? 0
  const outputTokens = response.usage?.output_tokens ?? 0
  const webSearchCalls = (response.output ?? []).filter((item: any) => item.type === 'web_search_call').length
  const estimatedCost =
    (inputTokens / 1_000_000) * INPUT_RATE_PER_MILLION +
    (outputTokens / 1_000_000) * OUTPUT_RATE_PER_MILLION +
    webSearchCalls * WEB_SEARCH_RATE_PER_CALL

  await supabase.from('ai_usage').insert({
    operation: 'COMPANY_DISCOVERY',
    model: MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: estimatedCost,
  })

  return { success: true, candidates: validCandidates, cost: estimatedCost }
}

export async function addDiscoveredCompany(
  name: string,
  companyType: string,
  industry: string | null,
  source: string
) {
  const supabase = await createClient()

  const { error } = await supabase.from('companies').insert({
    name,
    company_type: companyType,
    industry,
    source: `AI-discovered: ${source}`,
  })

  if (error) {
    console.error('addDiscoveredCompany error:', error)
    return { error: 'Could not save the company. Please try again.' }
  }
  return { success: true }
}