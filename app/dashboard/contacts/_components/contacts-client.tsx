'use client'

import { useState, useTransition, useMemo } from 'react'
import { addContact, updateContact, deleteContact } from '../actions'
import { toCSV, downloadCSV } from '@/lib/csv'

type Company = { id: string; name: string }

type Contact = {
  id: string
  company_id: string
  company: { id: string; name: string } | null
  name: string
  designation: string | null
  department: string | null
  linkedin_url: string | null
  email: string | null
  phone: string | null
  location: string | null
  decision_maker_category: string | null
  data_source: string | null
  verification_status: string | null
  do_not_contact: boolean
  verified_at: string | null
  created_at: string
}

const CSV_COLUMNS = ['name', 'company_id', 'designation', 'department', 'linkedin_url', 'email', 'phone', 'location', 'decision_maker_category', 'data_source', 'verification_status', 'do_not_contact', 'created_at']

export default function ContactsClient({
  initialContacts,
  companies,
}: {
  initialContacts: Contact[]
  companies: Company[]
}) {
  const [contacts, setContacts] = useState(initialContacts)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const decisionCategories = useMemo(
    () => Array.from(new Set(contacts.map((c) => c.decision_maker_category).filter(Boolean))) as string[],
    [contacts]
  )
  const verificationStatuses = useMemo(
    () => Array.from(new Set(contacts.map((c) => c.verification_status).filter(Boolean))) as string[],
    [contacts]
  )

  const filtered = contacts.filter((c) => {
    if (search && !`${c.name} ${c.email ?? ''} ${c.designation ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
    if (companyFilter && c.company_id !== companyFilter) return false
    if (statusFilter && c.verification_status !== statusFilter) return false
    if (categoryFilter && c.decision_maker_category !== categoryFilter) return false
    return true
  })

  function openAdd() {
    setEditing(null)
    setError(null)
    setShowForm(true)
  }

  function openEdit(contact: Contact) {
    setEditing(contact)
    setError(null)
    setShowForm(true)
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = editing ? await updateContact(editing.id, formData) : await addContact(formData)
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
      const result = await deleteContact(id)
      if (result?.error) {
        setError(result.error)
        return
      }
      setContacts((prev) => prev.filter((c) => c.id !== id))
    })
  }

  function handleExport() {
    const exportRows = contacts.map((c) => ({ ...c, company_id: c.company?.name ?? c.company_id }))
    const csv = toCSV(exportRows, CSV_COLUMNS)
    downloadCSV('contacts.csv', csv)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl text-[#1F2430]">Contacts</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="rounded border border-black/10 px-4 py-2 text-sm hover:bg-black/5">
            Export CSV
          </button>
          <button
            onClick={openAdd}
            disabled={companies.length === 0}
            className="rounded bg-[#A87C4F] px-4 py-2 text-sm text-white hover:bg-[#946a42] disabled:opacity-50"
          >
            Add Contact
          </button>
        </div>
      </div>

      {companies.length === 0 && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Add a company first before adding contacts.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          placeholder="Search name, email, designation…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-black/10 px-3 py-2 text-sm"
        />
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="rounded border border-black/10 px-3 py-2 text-sm">
          <option value="">All Companies</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border border-black/10 px-3 py-2 text-sm">
          <option value="">All Verification Statuses</option>
          {verificationStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded border border-black/10 px-3 py-2 text-sm">
          <option value="">All Decision-Maker Categories</option>
          {decisionCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded border border-black/10 bg-white p-8 text-center text-[#6B7280]">
          {contacts.length === 0 ? 'No contacts yet. Click "Add Contact" to create your first one.' : 'No contacts match your search/filters.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-black/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-[#6B7280]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">LinkedIn</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Do Not Contact</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 text-[#1F2430]">{c.name}</td>
                  <td className="px-4 py-3">{c.company?.name ?? '—'}</td>
                  <td className="px-4 py-3">{c.designation || '—'}</td>
                  <td className="px-4 py-3">{c.department || '—'}</td>
                  <td className="px-4 py-3">{c.decision_maker_category || '—'}</td>
                  <td className="px-4 py-3">
                    {c.linkedin_url ? (
                      <span>
                        {c.linkedin_url}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">{c.email || '—'}</td>
                  <td className="px-4 py-3">{c.phone || '—'}</td>
                  <td className="px-4 py-3">{c.location || '—'}</td>
                  <td className="px-4 py-3">{c.verification_status || '—'}</td>
                  <td className="px-4 py-3">
                    {c.do_not_contact ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Yes</span>
                    ) : (
                      <span className="text-[#6B7280]">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded bg-white p-6 my-8">
            <h3 className="mb-4 font-serif text-lg text-[#1F2430]">{editing ? 'Edit Contact' : 'Add Contact'}</h3>
            <form action={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-[#6B7280]">Company *</label>
                <select
                  name="company_id"
                  required
                  defaultValue={editing?.company_id ?? ''}
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm"
                >
                  <option value="" disabled>Select a company</option>
                  {companies.map((co) => <option key={co.id} value={co.id}>{co.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#6B7280]">Name *</label>
                <input
                  name="name"
                  required
                  defaultValue={editing?.name ?? ''}
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm"
                />
              </div>

              {[
                { name: 'designation', label: 'Designation' },
                { name: 'department', label: 'Department' },
                { name: 'linkedin_url', label: 'LinkedIn URL' },
                { name: 'email', label: 'Email' },
                { name: 'phone', label: 'Phone' },
                { name: 'location', label: 'Location' },
                { name: 'decision_maker_category', label: 'Decision Maker Category' },
                { name: 'data_source', label: 'Data Source' },
                { name: 'verification_status', label: 'Verification Status (e.g. VERIFIED, UNVERIFIED, REQUIRES_VERIFICATION)' },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm text-[#6B7280]">{field.label}</label>
                  <input
                    name={field.name}
                    defaultValue={editing ? (editing as any)[field.name] ?? '' : ''}
                    className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm text-[#6B7280]">Verified At</label>
                <input
                  type="datetime-local"
                  name="verified_at"
                  defaultValue={editing?.verified_at ? editing.verified_at.slice(0, 16) : ''}
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-[#1F2430]">
                <input type="checkbox" name="do_not_contact" defaultChecked={editing?.do_not_contact ?? false} />
                Do Not Contact
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded px-4 py-2 text-sm text-[#6B7280] hover:bg-black/5">Cancel</button>
                <button type="submit" disabled={isPending} className="rounded bg-[#A87C4F] px-4 py-2 text-sm text-white hover:bg-[#946a42] disabled:opacity-50">
                  {isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}