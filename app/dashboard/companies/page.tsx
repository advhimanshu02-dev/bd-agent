import { createClient } from '@/utils/supabase/server'
import CompaniesClient from './_components/companies-client'

export default async function CompaniesPage() {
  const supabase = await createClient()
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
        Couldn&apos;t load companies: {error.message}
      </div>
    )
  }

  return <CompaniesClient initialCompanies={companies ?? []} />
}