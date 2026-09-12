'use client'

import { useState, useTransition, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { addLead, updateLead, deleteLead } from '../actions'
import { toCSV, downloadCSV } from '@/lib/csv'
import { PIPELINE_STAGES, stageLabel } from '@/lib/pipeline'

type Company = { id: string; name: string }
type Contact = { id: string; name: string; company_id: string }

type Lead = {
  id: string
  company_id: string
  contact_id: string
  company: { id: string; name: string } | null
  contact: { id: string; name: string; company_id: string } | null
  status: string
  lead_score: number | null
  priority: string | null
  score_reason: string | null
  potential_requirement: string | null
  relevant_service: string | null
  personalization_points: string | null
  interested: boolean | null
  meeting_requested: boolean
  meeting_date: string | null
  proposal_sent: boolean
  proposal_value: number | null
  converted: boolean
  lost_reason: string | null
  created_at: string
}

const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW']
const CSV_COLUMNS = ['company', 'contact', 'status', 'priority', 'lead_score', 'interested', 'meeting_requested', 'proposal_sent', 'converted', 'created_at']

export default function LeadsClient({
  initialLeads,
  companies,
  contacts,
}: {
  initialLeads: Lead[]
  companies: Company[]
  contacts: Contact[]
}) {
  const [leads, setLeads] = useState(initialLeads)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [formCompanyId, setFormCompanyId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const searchParams = useSearchParams()

    useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId) return
    const match = leads.find((l) => l.id === editId)
    if (!match) return
    queueMicrotask(() => {
      setEditing(match)
      setFormCompanyId(match.company_id)
      setShowForm(true)
    })
  }, [searchParams, leads])
  const availableContacts = contacts.filter((c) => c.company_id === formCompanyId)

  const filtered = leads.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false
    if (priorityFilter && l.priority !== priorityFilter) return false
    return true
  })

  function openAdd() {
    setEditing(null)
    setFormCompanyId('')
    setError(null)
    setShowForm(true)
  }

  function openEdit(lead: Lead) {
    setEditing(lead)
    setFormCompanyId(lead.company_id)
    setError(null)
    setShowForm(true)
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = editing ? await updateLead(editing.id, formData) : await addLead(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setShowForm(false)
      window.location.reload()
    })
  }

  function handleDelete(id: string, label: string) {
    if (!confirm(`Delete lead "${label}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteLead(id)
      if (result?.error) {
        setError(result.error)
        return
      }
      setLeads((prev) => prev.filter((l) => l.id !== id))
    })
  }

  function handleExport() {
    const exportRows = leads.map((l) => ({
      company: l.company?.name ?? '',
      contact: l.contact?.name ?? '',
      status: stageLabel(l.status),
      priority: l.priority ?? '',
      lead_score: l.lead_score ?? '',
      interested: l.interested === null ? '' : l.interested ? 'true' : 'false',
      meeting_requested: l.meeting_requested,
      proposal_sent: l.proposal_sent,
      converted: l.converted,
      created_at: l.created_at,
    }))
    const csv = toCSV(exportRows, CSV_COLUMNS)
    downloadCSV('leads.csv', csv)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl text-[#1F2430]">Leads</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="rounded border border-black/10 px-4 py-2 text-sm hover:bg-black/5">
            Export CSV
          </button>
          <button
            onClick={openAdd}
            disabled={companies.length === 0 || contacts.length === 0}
            className="rounded bg-[#A87C4F] px-4 py-2 text-sm text-white hover:bg-[#946a42] disabled:opacity-50"
          >
            Add Lead
          </button>
        </div>
      </div>

      {(companies.length === 0 || contacts.length === 0) && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Add at least one company and contact before creating a lead.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border border-black/10 px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {PIPELINE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded border border-black/10 px-3 py-2 text-sm">
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded border border-black/10 bg-white p-8 text-center text-[#6B7280]">
          {leads.length === 0 ? 'No leads yet. Click "Add Lead" to create your first one.' : 'No leads match your filters.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-black/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-[#6B7280]">
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Interested</th>
                <th className="px-4 py-3">Meeting</th>
                <th className="px-4 py-3">Converted</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3">{l.company?.name ?? '—'}</td>
                  <td className="px-4 py-3">{l.contact?.name ?? '—'}</td>
                  <td className="px-4 py-3">{stageLabel(l.status)}</td>
                  <td className="px-4 py-3">{l.priority || '—'}</td>
                  <td className="px-4 py-3">{l.lead_score ?? '—'}</td>
                  <td className="px-4 py-3">{l.interested === null ? '—' : l.interested ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">{l.meeting_requested ? 'Requested' : '—'}</td>
                  <td className="px-4 py-3">{l.converted ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/dashboard/leads/${l.id}`} className="mr-3 text-[#A87C4F] hover:underline">View</Link>
                    <button onClick={() => openEdit(l)} className="mr-3 text-[#A87C4F] hover:underline">Edit</button>
                    <button onClick={() => handleDelete(l.id, l.contact?.name ?? l.id)} className="text-red-600 hover:underline">Delete</button>
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
            <h3 className="mb-4 font-serif text-lg text-[#1F2430]">{editing ? 'Edit Lead' : 'Add Lead'}</h3>
            <form action={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-[#6B7280]">Company *</label>
                <select
                  name="company_id"
                  required
                  value={formCompanyId}
                  onChange={(e) => setFormCompanyId(e.target.value)}
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm"
                >
                  <option value="" disabled>Select a company</option>
                  {companies.map((co) => <option key={co.id} value={co.id}>{co.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#6B7280]">Contact *</label>
                <select
                  name="contact_id"
                  required
                  defaultValue={editing?.contact_id ?? ''}
                  disabled={!formCompanyId}
                  className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm disabled:bg-black/5"
                >
                  <option value="" disabled>{formCompanyId ? 'Select a contact' : 'Select a company first'}</option>
                  {availableContacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#6B7280]">Status</label>
                <select name="status" defaultValue={editing?.status ?? 'RESEARCH'} className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm">
                  {PIPELINE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#6B7280]">Priority</label>
                <select name="priority" defaultValue={editing?.priority ?? ''} className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm">
                  <option value="">—</option>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#6B7280]">Lead Score</label>
                <input type="number" name="lead_score" defaultValue={editing?.lead_score ?? ''} className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm" />
              </div>

              {[
                { name: 'score_reason', label: 'Score Reason' },
                { name: 'potential_requirement', label: 'Potential Requirement' },
                { name: 'relevant_service', label: 'Relevant Service' },
                { name: 'personalization_points', label: 'Personalization Points' },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-sm text-[#6B7280]">{f.label}</label>
                  <textarea name={f.name} defaultValue={editing ? (editing as any)[f.name] ?? '' : ''} rows={2} className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm" />
                </div>
              ))}

              <div>
                <label className="block text-sm text-[#6B7280]">Interested</label>
                <select name="interested" defaultValue={editing?.interested === null || editing?.interested === undefined ? '' : String(editing.interested)} className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm">
                  <option value="">Unknown</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-[#1F2430]">
                <input type="checkbox" name="meeting_requested" defaultChecked={editing?.meeting_requested ?? false} />
                Meeting Requested
              </label>

              <div>
                <label className="block text-sm text-[#6B7280]">Meeting Date</label>
                <input type="datetime-local" name="meeting_date" defaultValue={editing?.meeting_date ? editing.meeting_date.slice(0, 16) : ''} className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm" />
              </div>

              <label className="flex items-center gap-2 text-sm text-[#1F2430]">
                <input type="checkbox" name="proposal_sent" defaultChecked={editing?.proposal_sent ?? false} />
                Proposal Sent
              </label>

              <div>
                <label className="block text-sm text-[#6B7280]">Proposal Value</label>
                <input type="number" step="0.01" name="proposal_value" defaultValue={editing?.proposal_value ?? ''} className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm" />
              </div>

              <label className="flex items-center gap-2 text-sm text-[#1F2430]">
                <input type="checkbox" name="converted" defaultChecked={editing?.converted ?? false} />
                Converted
              </label>

              <div>
                <label className="block text-sm text-[#6B7280]">Lost Reason</label>
                <input name="lost_reason" defaultValue={editing?.lost_reason ?? ''} className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded px-4 py-2 text-sm text-[#6B7280] hover:bg-black/5">Cancel</button>
                <button type="submit" disabled={isPending} className="rounded bg-[#A87C4F] px-4 py-2 text-sm text-white hover:bg-[#946a42] disabled:opacity-50">
                  {isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}