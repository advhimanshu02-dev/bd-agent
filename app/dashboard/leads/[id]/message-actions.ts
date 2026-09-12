'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod/v3'

const DraftSchema = z.object({
  subject_line: z.string(),
  body: z.string(),
  fact_referenced: z.string().nullable(),
})

const MODEL = 'gpt-4o-mini'
const INPUT_RATE_PER_MILLION = 0.15
const OUTPUT_RATE_PER_MILLION = 0.60

const MANDATORY_PDF_LINE =
  'Please find our detailed corporate profile and service brief attached as a PDF document for your review.'

const TEMPLATE_INSTRUCTIONS = `
You are drafting a business development outreach email for Advocate Himanshu, who provides legal recovery and operational services to banks, NBFCs, and fintech lenders in India.

You MUST follow this exact structure and content — only the subject line, greeting name, and the opening "hook" paragraph are personalized. Everything else below is FIXED and must be reproduced essentially verbatim (light wording adjustments for flow are fine, but do not remove or invent new sections):

---
Subject: Strategic Partnership Inquiry: Legal Recovery & Operational Support for {{COMPANY_NAME}}

Dear {{GREETING_NAME}},

{{PERSONALIZED_HOOK_PARAGRAPH — 1-2 sentences}}

I am reaching out to introduce our legal recovery and operational services. I work at the intersection of banking, financial services, recovery and legal operations, with more than 10 years of professional experience in the financial and recovery ecosystem.

Over the years, I have worked across banking and finance-related functions, developing a practical understanding of recovery processes, financial documentation, legal escalation, customer communication and institutional operations.

Today, I work with multiple organisations to support Banks, NBFCs, FinTech companies and other financial institutions with specialised legal recovery and operational services.

My core areas of work include:
- Legal Notice Management – end-to-end notice generation, documentation, dispatch, tracking, POD management and follow-up.
- Case Filing & Litigation Support – pre-filing documentation, case preparation, evidence compilation, filing coordination and case-status management.
- Legal Recovery Call Centre – structured customer communication, call disposition, Promise-to-Pay management, settlement follow-up and escalation.
- Recovery Operations – account review, legal escalation, recovery workflow management, documentation and MIS.
- Legal Process Management – coordination between financial institutions, legal teams, advocates, recovery teams and service providers.
- Documentation & Compliance Support – review and organisation of financial and legal documentation required for recovery and legal proceedings.

Beyond legal recovery, I also work on business development, strategic partnerships and institutional initiatives, helping organisations identify new service opportunities, build B2B relationships and develop solutions for the banking and financial-services ecosystem.

I am particularly interested in building scalable and process-driven solutions that connect collections, legal recovery and litigation rather than treating them as isolated functions.

My approach is simple:
Understand the institution's requirement → structure the process → deploy the right service capability → monitor execution → deliver measurable outcomes.

I am open to working with Banks, NBFCs, FinTechs, financial institutions, collection agencies and other organisations looking to strengthen their legal recovery, notice management, case-support or financial-services operations.

If you are working on improving {{COMPANY_NAME}}'s recovery or legal operations, I would be happy to connect and explore a potential association.

${MANDATORY_PDF_LINE}

Warm regards,
Advocate Himanshu
---

Rules for the HOOK PARAGRAPH specifically:
- Base it ONLY on verified FACT findings provided below. Never invent a fact.
- If a usable FACT exists, briefly reference it and connect it to {{COMPANY_NAME}}'s lending or legal recovery needs.
- If no usable FACT exists, use exactly this fallback: "I noticed your institutional presence in the {{COMPANY_TYPE_OR_INDUSTRY}} space and wanted to connect regarding your legal recovery workflows."

GREETING_NAME: use the contact's full name (e.g. "Dear Kavita Sharma,") — do not guess a gendered title like Mr./Ms. since gender is not known data.
`.trim()

export async function generateDraft(leadId: string, refinementInstruction?: string) {
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
    return { error: 'This contact is marked Do Not Contact. Outreach cannot be prepared for them.' }
  }

  if (!process.env.OPENAI_API_KEY) {
    return { error: 'OPENAI_API_KEY is not configured on the server.' }
  }

  const { data: findings } = await supabase
    .from('research_findings')
    .select('*')
    .eq('lead_id', leadId)
    .eq('finding_type', 'FACT')

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const companyName = lead.company?.name ?? 'your organisation'
  const companyTypeOrIndustry = lead.company?.company_type || lead.company?.industry || 'financial services'
  const contactName = lead.contact?.name ?? 'there'

  const factsText =
    findings && findings.length > 0
      ? findings.map((f) => `- ${f.content}${f.source ? ` (source: ${f.source})` : ''}`).join('\n')
      : '(no verified FACT findings available for this lead)'

  const refinementText = refinementInstruction
    ? `\n\nADDITIONAL REFINEMENT REQUEST from the user for this draft: "${refinementInstruction}" — apply this adjustment while still following the fixed template structure above.`
    : ''

  const prompt = `
${TEMPLATE_INSTRUCTIONS}

Company name: ${companyName}
Company type/industry: ${companyTypeOrIndustry}
Contact name: ${contactName}

Verified FACT findings about this company (use only these for the hook paragraph, never invent beyond them):
${factsText}
${refinementText}
`.trim()

  let response
  try {
    response = await openai.responses.parse({
      model: MODEL,
      input: prompt,
      text: { format: zodTextFormat(DraftSchema, 'message_draft') },
    })
  } catch (err: any) {
    return { error: `Draft generation failed: ${err?.message ?? 'unknown error'}` }
  }

  const parsed = response.output_parsed
  if (!parsed) {
    return { error: 'The AI did not return a usable draft.' }
  }

  // Server-side enforcement: the mandatory PDF line must be present, no matter what the AI produced
  let body = parsed.body
  if (!body.includes(MANDATORY_PDF_LINE)) {
    const signOffIndex = body.indexOf('Warm regards')
    if (signOffIndex !== -1) {
      body = body.slice(0, signOffIndex) + MANDATORY_PDF_LINE + '\n\n' + body.slice(signOffIndex)
    } else {
      body = body + '\n\n' + MANDATORY_PDF_LINE
    }
  }

  const inputTokens = response.usage?.input_tokens ?? 0
  const outputTokens = response.usage?.output_tokens ?? 0
  const estimatedCost =
    (inputTokens / 1_000_000) * INPUT_RATE_PER_MILLION +
    (outputTokens / 1_000_000) * OUTPUT_RATE_PER_MILLION

  await supabase.from('ai_usage').insert({
    lead_id: leadId,
    operation: 'MESSAGE_DRAFT',
    model: MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: estimatedCost,
  })

  await supabase.from('activities').insert({
    lead_id: leadId,
    activity_type: 'MESSAGE_DRAFTED',
    description: `Drafted outreach message${refinementInstruction ? ' (refined)' : ''}: "${parsed.subject_line}"`,
  })

  revalidatePath(`/dashboard/leads/${leadId}`)

  return {
    success: true,
    subject: parsed.subject_line,
    body,
    factReferenced: parsed.fact_referenced,
  }
}

export async function saveDraft(leadId: string, subject: string, body: string) {
  const supabase = await createClient()

  const combined = `Subject: ${subject}\n\n${body}`

  const { error } = await supabase
    .from('leads')
    .update({ personalization_points: combined, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) return { error: error.message }

  await supabase.from('activities').insert({
    lead_id: leadId,
    activity_type: 'NOTE_ADDED',
    description: 'Saved outreach message draft.',
  })

  revalidatePath(`/dashboard/leads/${leadId}`)
  return { success: true }
}