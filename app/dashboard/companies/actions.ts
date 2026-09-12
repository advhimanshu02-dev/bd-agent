'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v3'

const CompanySchema = z.object({
  name: z.string().trim().min(1, 'Company name is required'),
  company_type: z.string().trim().nullable(),
  website: z.string().trim().nullable(),
  industry: z.string().trim().nullable(),
  headquarters: z.string().trim().nullable(),
  size: z.string().trim().nullable(),
  lending_category: z.string().trim().nullable(),
  source: z.string().trim().nullable(),
  notes: z.string().trim().nullable(),
})

function buildPayload(formData: FormData) {
  const raw = {
    name: formData.get('name') as string,
    company_type: (formData.get('company_type') as string) || null,
    website: (formData.get('website') as string) || null,
    industry: (formData.get('industry') as string) || null,
    headquarters: (formData.get('headquarters') as string) || null,
    size: (formData.get('size') as string) || null,
    lending_category: (formData.get('lending_category') as string) || null,
    source: (formData.get('source') as string) || null,
    notes: (formData.get('notes') as string) || null,
  }
  return CompanySchema.safeParse(raw)
}

export async function addCompany(formData: FormData) {
  const parsed = buildPayload(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid company data.' }

  const supabase = await createClient()
  const { error } = await supabase.from('companies').insert(parsed.data)
  if (error) {
    console.error('addCompany error:', error)
    return { error: 'Could not save the company. Please try again.' }
  }
  revalidatePath('/dashboard/companies')
  return { success: true }
}

export async function updateCompany(id: string, formData: FormData) {
  const parsed = buildPayload(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid company data.' }

  const supabase = await createClient()
  const { error } = await supabase.from('companies').update(parsed.data).eq('id', id)
  if (error) {
    console.error('updateCompany error:', error)
    return { error: 'Could not save changes. Please try again.' }
  }
  revalidatePath('/dashboard/companies')
  return { success: true }
}

export async function deleteCompany(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) {
    console.error('deleteCompany error:', error)
    return { error: 'Could not delete the company. Please try again.' }
  }
  revalidatePath('/dashboard/companies')
  return { success: true }
}