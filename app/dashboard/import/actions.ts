'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

type CompanyRow = {
  name: string
  company_type?: string
  website?: string
  industry?: string
  headquarters?: string
  size?: string
  lending_category?: string
  source?: string
  notes?: string
}

type ContactRow = {
  name: string
  company_name: string
  designation?: string
  department?: string
  linkedin_url?: string
  email?: string
  phone?: string
  location?: string
  decision_maker_category?: string
  data_source?: string
  verification_status?: string
  do_not_contact?: string
}

function parseBoolean(val: string | undefined): boolean {
  if (!val) return false
  const normalized = val.trim().toLowerCase()
  return ['true', 'yes', 'y', '1'].includes(normalized)
}

export async function importCompanies(rows: CompanyRow[]) {
  const supabase = await createClient()

  const validRows = rows.filter((r) => r.name && r.name.trim())
  if (validRows.length === 0) {
    return { error: 'No valid rows found — every row needs at least a "name" value.' }
  }

  const payload = validRows.map((r) => ({
    name: r.name.trim(),
    company_type: r.company_type?.trim() || null,
    website: r.website?.trim() || null,
    industry: r.industry?.trim() || null,
    headquarters: r.headquarters?.trim() || null,
    size: r.size?.trim() || null,
    lending_category: r.lending_category?.trim() || null,
    source: r.source?.trim() || 'CSV import',
    notes: r.notes?.trim() || null,
  }))

  const { error, count } = await supabase.from('companies').insert(payload, { count: 'exact' })
  if (error) {
    console.error('importCompanies error:', error)
    return { error: 'Import failed. Please check your file and try again.' }
  }

  revalidatePath('/dashboard/companies')
  return { success: true, inserted: count ?? payload.length }
}

export async function importContacts(rows: ContactRow[]) {
  const supabase = await createClient()

  const { data: companies } = await supabase.from('companies').select('id, name')
  const companyByName = new Map((companies ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]))

  const skipped: { row: number; reason: string }[] = []
  const payload: any[] = []

  rows.forEach((r, i) => {
    if (!r.name || !r.name.trim()) {
      skipped.push({ row: i + 1, reason: 'Missing name' })
      return
    }
    if (!r.company_name || !r.company_name.trim()) {
      skipped.push({ row: i + 1, reason: 'Missing company_name' })
      return
    }
    const companyId = companyByName.get(r.company_name.trim().toLowerCase())
    if (!companyId) {
      skipped.push({ row: i + 1, reason: `No matching company found for "${r.company_name}"` })
      return
    }
    payload.push({
      company_id: companyId,
      name: r.name.trim(),
      designation: r.designation?.trim() || null,
      department: r.department?.trim() || null,
      linkedin_url: r.linkedin_url?.trim() || null,
      email: r.email?.trim() || null,
      phone: r.phone?.trim() || null,
      location: r.location?.trim() || null,
      decision_maker_category: r.decision_maker_category?.trim() || null,
      data_source: r.data_source?.trim() || 'CSV import',
      verification_status: r.verification_status?.trim() || null,
      do_not_contact: parseBoolean(r.do_not_contact),
    })
  })

  if (payload.length === 0) {
    return { error: 'No valid rows to import.', skipped }
  }

  const { error, count } = await supabase.from('contacts').insert(payload, { count: 'exact' })
  if (error) {
    console.error('importContacts error:', error)
    return { error: 'Import failed. Please check your file and try again.' }
  }

  revalidatePath('/dashboard/contacts')
  return { success: true, inserted: count ?? payload.length, skipped }
}