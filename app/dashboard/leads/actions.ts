'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v3'
import { PIPELINE_STAGE_KEYS } from '@/lib/pipeline'

const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const

const LeadSchema = z.object({
  company_id: z.string().uuid('Please select a valid company'),
  contact_id: z.string().uuid('Please select a valid contact'),
  status: z.enum(PIPELINE_STAGE_KEYS as [string, ...string[]]),
  lead_score: z.number().int().min(0).max(100).nullable(),
  priority: z.enum(PRIORITIES).nullable(),
  score_reason: z.string().nullable(),
  potential_requirement: z.string().nullable(),
  relevant_service: z.string().nullable(),
  personalization_points: z.string().nullable(),
  interested: z.boolean().nullable(),
  meeting_requested: z.boolean(),
  meeting_date: z.string().nullable(),
  proposal_sent: z.boolean(),
  proposal_value: z.number().nullable(),
  converted: z.boolean(),
  lost_reason: z.string().nullable(),
})

function buildPayload(formData: FormData) {
  const interestedRaw = formData.get('interested') as string
  const raw = {
    company_id: formData.get('company_id') as string,
    contact_id: formData.get('contact_id') as string,
    status: (formData.get('status') as string) || 'RESEARCH',
    lead_score: formData.get('lead_score') ? Number(formData.get('lead_score')) : null,
    priority: (formData.get('priority') as string) || null,
    score_reason: (formData.get('score_reason') as string) || null,
    potential_requirement: (formData.get('potential_requirement') as string) || null,
    relevant_service: (formData.get('relevant_service') as string) || null,
    personalization_points: (formData.get('personalization_points') as string) || null,
    interested: interestedRaw === 'true' ? true : interestedRaw === 'false' ? false : null,
    meeting_requested: formData.get('meeting_requested') === 'on',
    meeting_date: (formData.get('meeting_date') as string) || null,
    proposal_sent: formData.get('proposal_sent') === 'on',
    proposal_value: formData.get('proposal_value') ? Number(formData.get('proposal_value')) : null,
    converted: formData.get('converted') === 'on',
    lost_reason: (formData.get('lost_reason') as string) || null,
  }
  return LeadSchema.safeParse(raw)
}

async function verifyOwnership(companyId: string, contactId: string) {
  const supabase = await createClient()
  const [{ data: company }, { data: contact }] = await Promise.all([
    supabase.from('companies').select('id').eq('id', companyId).single(),
    supabase.from('contacts').select('id, company_id').eq('id', contactId).single(),
  ])
  if (!company) return 'Selected company was not found in your account.'
  if (!contact) return 'Selected contact was not found in your account.'
  if (contact.company_id !== companyId) return 'Selected contact does not belong to the selected company.'
  return null
}

export async function addLead(formData: FormData) {
  const parsed = buildPayload(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid lead data.' }

  const ownershipError = await verifyOwnership(parsed.data.company_id, parsed.data.contact_id)
  if (ownershipError) return { error: ownershipError }

  const supabase = await createClient()
  const { error } = await supabase.from('leads').insert(parsed.data)
  if (error) {
    console.error('addLead error:', error)
    return { error: 'Could not save the lead. Please try again.' }
  }
  revalidatePath('/dashboard/leads')
  return { success: true }
}

export async function updateLead(id: string, formData: FormData) {
  const parsed = buildPayload(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid lead data.' }

  const ownershipError = await verifyOwnership(parsed.data.company_id, parsed.data.contact_id)
  if (ownershipError) return { error: ownershipError }

  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.error('updateLead error:', error)
    return { error: 'Could not save changes. Please try again.' }
  }
  revalidatePath('/dashboard/leads')
  revalidatePath(`/dashboard/leads/${id}`)
  return { success: true }
}

export async function deleteLead(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) {
    console.error('deleteLead error:', error)
    return { error: 'Could not delete the lead. Please try again.' }
  }
  revalidatePath('/dashboard/leads')
  return { success: true }
}