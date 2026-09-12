'use client'

import { useState, useTransition } from 'react'
import { markSent } from '../actions'
import { isSafeUrl } from '@/lib/url'

type Lead = {
  id: string
  status: string
  priority: string | null
  lead_score: number | null
  personalization_points: string | null
  company: { id: string; name: string } | null
  contact: { id: string; name: string; designation: string | null; linkedin_url: string | null } | null
}

const TIER_STYLES: Record<string, string> = {
  HOT: 'bg-emerald-100 text-emerald-800',
  WARM: 'bg-amber-100 text-amber-800',
  COLD: 'bg-slate-100 text-slate-700',
}

function subjectOf(personalizationPoints: string | null): string {
  if (!personalizationPoints) return '(no draft)'
  const match = personalizationPoints.match(/^Subject: (.*)/)
  return match ? match[1] : personalizationPoints.slice(0, 60)
}

export default function OutreachClient({ leads: initialLeads }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCopy(lead: Lead) {
    if (!lead.personalization_points) return
    navigator.clipboard.writeText(lead.personalization_points).then(() => {
      setCopiedId(lead.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function handleMarkSent(leadId: string) {
    if (!confirm('Mark this lead as contacted? This will remove it from the queue.')) return
    startTransition(async () => {
      const result = await markSent(leadId)
      if (!result?.error) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId))
      }
    })
  }

  return (
    <div>
      <h2 className="mb-4 font-serif text-xl text-[#1F2430]">Outreach Queue</h2>

      {leads.length === 0 ? (
        <div className="rounded border border-black/10 bg-white p-8 text-center text-[#6B7280]">
          No leads ready for outreach yet. Generate and save a message draft on a lead first.
        </div>
      ) : (
        <ul className="space-y-3">
          {leads.map((lead) => (
            <li key={lead.id} className="rounded border border-black/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#1F2430]">
                    <span className="font-medium">{lead.company?.name}</span> — {lead.contact?.name} ({lead.contact?.designation || '—'})
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">{subjectOf(lead.personalization_points)}</p>
                  {lead.priority && (
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${TIER_STYLES[lead.priority] ?? ''}`}>
                      {lead.priority} {lead.lead_score !== null ? `(${lead.lead_score})` : ''}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    onClick={() => handleCopy(lead)}
                    className="rounded border border-black/10 px-3 py-1.5 text-xs hover:bg-black/5"
                  >
                    {copiedId === lead.id ? 'Copied' : 'Copy'}
                  </button>
                  {isSafeUrl(lead.contact?.linkedin_url) ? (
                    
                         <a href={lead.contact!.linkedin_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-black/10 px-3 py-1.5 text-xs hover:bg-black/5"
                    >
                      Open LinkedIn
                    </a>
                  ) : (
                    <span className="rounded border border-black/10 px-3 py-1.5 text-xs text-[#6B7280] opacity-50">
                      No LinkedIn URL
                    </span>
                  )}
                  <button
                    onClick={() => handleMarkSent(lead.id)}
                    disabled={isPending}
                    className="rounded bg-[#A87C4F] px-3 py-1.5 text-xs text-white hover:bg-[#946a42] disabled:opacity-50"
                  >
                    Mark Sent
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}