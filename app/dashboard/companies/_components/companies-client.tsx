'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { addCompany, updateCompany, deleteCompany } from '../actions'
import { toCSV, downloadCSV } from '@/lib/csv'
import { isSafeUrl } from '@/lib/url'
import DiscoverCompanies from './discover-companies'

type Company = {
  id: string
  name: string
  company_type: string | null
  website: string | null
  industry: string | null
  headquarters: string | null
  size: string | null
  lending_category: string | null
  source: string | null
  notes: string | null
  created_at: string
}

const CSV_COLUMNS = ['name', 'company_type', 'website', 'industry', 'headquarters', 'size', 'lending_category', 'source', 'notes', 'created_at']

export default function CompaniesClient({ initialCompanies }: { initialCompanies: Company[] }) {
  const [companies, setCompanies] = useState(initialCompanies)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openAdd() {
    setEditing(null)
    setError(null)
    setShowForm(true)
  }

  function openEdit(company: Company) {
    setEditing(company)
    setError(null)
    setShowForm(true)
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = editing ? await updateCompany(editing.id, formData) : await addCompany(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setShowForm(false)
      window.location.reload()
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteCompany(id)
      if (result?.error) {
        setError(result.error)
        return
      }
      setCompanies((prev) => prev.filter((c) => c.id !== id))
    })
  }

  function handleExport() {
    const csv = toCSV(companies, CSV_COLUMNS)
    downloadCSV('companies.csv', csv)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl text-[#1F2430]">Companies</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="rounded border border-black/10 px-4 py-2 text-sm hover:bg-black/5">
            Export CSV
          </button>
          <button onClick={openAdd} className="rounded bg-[#A87C4F] px-4 py-2 text-sm text-white hover:bg-[#946a42]">
            Add Company
          </button>
        </div>
      </div>

      <DiscoverCompanies />

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {companies.length === 0 ? (
        <div className="rounded border border-black/10 bg-white p-8 text-center text-[#6B7280]">
          No companies yet. Click &quot;Add Company&quot; to create your first one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-black/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-[#6B7280]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">Headquarters</th>
                <th className="px-4 py-3">Lending Category</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 text-[#1F2430]">{c.name}</td>
                  <td className="px-4 py-3">{c.company_type || '—'}</td>
                  <td className="px-4 py-3">{c.industry || '—'}</td>
                  <td className="px-4 py-3">{c.headquarters || '—'}</td>
                  <td className="px-4 py-3">{c.lending_category || '—'}</td>
                  <td className="px-4 py-3">
                    {isSafeUrl(c.website) ? (
                      <a href={c.website!} target="_blank" rel="noopener noreferrer" className="text-[#A87C4F] underline">
                        {c.website}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">{new Date(c.created_at).toISOString().split('T')[0]}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/dashboard/companies/${c.id}`} className="mr-3 text-[#A87C4F] hover:underline">View</Link>
                    <button onClick={() => openEdit(c)} className="mr-3 text-[#A87C4F] hover:underline">Edit</button>
                    <button onClick={() => handleDelete(c.id, c.name)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded bg-white p-6">
            <h3 className="mb-4 font-serif text-lg text-[#1F2430]">{editing ? 'Edit Company' : 'Add Company'}</h3>
            <form action={handleSubmit} className="space-y-3">
              {[
                { name: 'name', label: 'Company Name', required: true },
                { name: 'company_type', label: 'Company Type' },
                { name: 'industry', label: 'Industry' },
                { name: 'headquarters', label: 'Headquarters' },
                { name: 'size', label: 'Size' },
                { name: 'lending_category', label: 'Lending Category' },
                { name: 'website', label: 'Website' },
                { name: 'source', label: 'Source' },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm text-[#6B7280]">{field.label}</label>
                  <input
                    name={field.name}
                    required={field.required}
                    defaultValue={editing ? (editing as any)[field.name] ?? '' : ''}
                    className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm text-[#6B7280]">Notes</label>
                <textarea
                  name="notes"
                  defaultValue={editing?.notes ?? ''}
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded px-4 py-2 text-sm text-[#6B7280] hover:bg-black/5">Cancel</button>
                <button type="submit" disabled={isPending} className="rounded bg-[#A87C4F] px-4 py-2 text-sm text-white hover:bg-[#946a42] disabled:opacity-50">
                  {isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}