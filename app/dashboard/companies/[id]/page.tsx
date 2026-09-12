import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SuggestedContacts from './_components/suggested-contacts'
import { isSafeUrl } from '@/lib/url'

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: company, error } = await supabase.from('companies').select('*').eq('id', id).single()
  if (error || !company) notFound()

  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <Link href="/dashboard/companies" className="text-sm text-[#A87C4F] hover:underline">&larr; Back to Companies</Link>

      <h2 className="mt-3 mb-4 font-serif text-xl text-[#1F2430]">{company.name}</h2>

      <section className="mb-6">
        <div className="rounded border border-black/10 bg-white p-4 text-sm grid grid-cols-1 md:grid-cols-2 gap-y-1">
          <p><span className="text-[#6B7280]">Type:</span> {company.company_type || '—'}</p>
          <p><span className="text-[#6B7280]">Industry:</span> {company.industry || '—'}</p>
          <p><span className="text-[#6B7280]">Headquarters:</span> {company.headquarters || '—'}</p>
          <p><span className="text-[#6B7280]">Size:</span> {company.size || '—'}</p>
          <p><span className="text-[#6B7280]">Lending Category:</span> {company.lending_category || '—'}</p>
          <p>
            <span className="text-[#6B7280]">Website:</span>{' '}
            {isSafeUrl(company.website) ? (
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-[#A87C4F] underline">{company.website}</a>
            ) : '—'}
          </p>
        </div>
      </section>

      <SuggestedContacts companyId={company.id} />

      <section>
        <h3 className="font-serif text-lg text-[#1F2430] mb-2">Existing Contacts</h3>
        {contacts && contacts.length > 0 ? (
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li key={c.id} className="rounded border border-black/10 bg-white p-3 text-sm">
                {c.name} — {c.designation || '—'}
                <span className="ml-2 text-xs text-[#6B7280]">({c.verification_status || 'no status'})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#6B7280]">No contacts yet for this company.</p>
        )}
      </section>
    </div>
  )
}