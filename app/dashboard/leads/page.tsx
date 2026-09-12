import { createClient } from '@/utils/supabase/server'
import LeadsClient from './_components/leads-client'

export default async function LeadsPage() {
  const supabase = await createClient()

  const [{ data: leads, error }, { data: companies }, { data: contacts }] = await Promise.all([
    supabase
      .from('leads')
      .select('*, company:companies(id, name), contact:contacts(id, name, company_id)')
      .order('created_at', { ascending: false }),
    supabase.from('companies').select('id, name').order('name'),
    supabase.from('contacts').select('id, name, company_id').order('name'),
  ])

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
        Couldn&apos;t load leads: {error.message}
      </div>
    )
  }

  return (
    <LeadsClient
      initialLeads={leads ?? []}
      companies={companies ?? []}
      contacts={contacts ?? []}
    />
  )
}