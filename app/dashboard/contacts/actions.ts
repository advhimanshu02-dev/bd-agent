'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v3'

const ContactSchema = z.object({
  company_id: z.string().uuid('Please select a valid company'),
  name: z.string().trim().min(1, 'Name is required'),
  designation: z.string().trim().nullable(),
  department: z.string().trim().nullable(),
  linkedin_url: z.string().trim().nullable(),
  email: z.string().trim().nullable(),
  phone: z.string().trim().nullable(),
  location: z.string().trim().nullable(),
  decision_maker_category: z.string().trim().nullable(),
  data_source: z.string().trim().nullable(),
  verification_status: z.string().trim().nullable(),
  do_not_contact: z.boolean(),
  verified_at: z.string().nullable(),
})

function buildPayload(formData: FormData) {
  const raw = {
    company_id: formData.get('company_id') as string,
    name: formData.get('name') as string,
    designation: (formData.get('designation') as string) || null,
    department: (formData.get('department') as string) || null,
    linkedin_url: (formData.get('linkedin_url') as string) || null,
    email: (formData.get('email') as string) || null,
    phone: (formData.get('phone') as string) || null,
    location: (formData.get('location') as string) || null,
    decision_maker_category: (formData.get('decision_maker_category') as string) || null,
    data_source: (formData.get('data_source') as string) || null,
    verification_status: (formData.get('verification_status') as string) || null,
    do_not_contact: formData.get('do_not_contact') === 'on',
    verified_at: (formData.get('verified_at') as string) || null,
  }
  return ContactSchema.safeParse(raw)
}

async function verifyCompanyOwnership(companyId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('companies').select('id').eq('id', companyId).single()
  return !!data
}

// Prevents the same person being added twice under the same company (case/whitespace-insensitive).
async function findDuplicateContact(companyId: string, name: string, excludeId?: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contacts')
    .select('id, name')
    .eq('company_id', companyId)

  const normalized = name.trim().toLowerCase()
  return (data ?? []).some((c) => c.id !== excludeId && c.name.trim().toLowerCase() === normalized)
}

export async function addContact(formData: FormData) {
  const parsed = buildPayload(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid contact data.' }

  const ownsCompany = await verifyCompanyOwnership(parsed.data.company_id)
  if (!ownsCompany) return { error: 'Selected company was not found in your account.' }

  const isDuplicate = await findDuplicateContact(parsed.data.company_id, parsed.data.name)
  if (isDuplicate) {
    return { error: `A contact named "${parsed.data.name}" already exists for this company.` }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('contacts').insert(parsed.data)
  if (error) {
    console.error('addContact error:', error)
    return { error: 'Could not save the contact. Please try again.' }
  }
  revalidatePath('/dashboard/contacts')
  return { success: true }
}

export async function updateContact(id: string, formData: FormData) {
  const parsed = buildPayload(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid contact data.' }

  const ownsCompany = await verifyCompanyOwnership(parsed.data.company_id)
  if (!ownsCompany) return { error: 'Selected company was not found in your account.' }

  const isDuplicate = await findDuplicateContact(parsed.data.company_id, parsed.data.name, id)
  if (isDuplicate) {
    return { error: `A contact named "${parsed.data.name}" already exists for this company.` }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('contacts').update(parsed.data).eq('id', id)
  if (error) {
    console.error('updateContact error:', error)
    return { error: 'Could not save changes. Please try again.' }
  }
  revalidatePath('/dashboard/contacts')
  return { success: true }
}

export async function deleteContact(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) {
    console.error('deleteContact error:', error)
    return { error: 'Could not delete the contact. Please try again.' }
  }
  revalidatePath('/dashboard/contacts')
  return { success: true }
}