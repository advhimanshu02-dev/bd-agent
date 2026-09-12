import Link from 'next/link'
import { DEFAULT_FOLLOWUP_DAYS } from '@/lib/constants'
import { PIPELINE_STAGES } from '@/lib/pipeline'

type Lead = {
  id: string
  status: string
  lead_score: number | null
  priority: string | null
  company: { id: string; name: string } | null
  contact: { id: string; name: string } | null
}

const TIER_STYLES: Record<string, string> = {
  HOT: 'bg-emerald-100 text-emerald-800',
  WARM: 'bg-amber-100 text-amber-800',
  COLD: 'bg-slate-100 text-slate-700',
}

function daysSince(dateStr: string | undefined): number | null {
  if (!dateStr) return null
  const diffMs = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export default function PipelineBoard({
  leads,
  lastActivityByLead,
}: {
  leads: Lead[]
  lastActivityByLead: Record<string, string>
}) {
  const columns = PIPELINE_STAGES.filter((s) => s.onBoard)

  return (
    <div>
      <h2 className="mb-4 font-serif text-xl text-[#1F2430]">Pipeline</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((stage) => {
          const columnLeads = leads.filter((l) => l.status === stage.key)
          return (
            <div key={stage.key} className="w-64 shrink-0">
              <h3 className="mb-2 text-sm font-medium text-[#6B7280]">
                {stage.label} <span className="text-[#A87C4F]">({columnLeads.length})</span>
              </h3>
              <div className="space-y-2">
                {columnLeads.map((lead) => {
                  const days = daysSince(lastActivityByLead[lead.id])
                  const needsFollowUp = stage.key === 'CONTACTED' && (days === null || days > DEFAULT_FOLLOWUP_DAYS)
                  return (
                    <Link
                      key={lead.id}
                      href={`/dashboard/leads/${lead.id}`}
                      className="block rounded border border-black/10 bg-white p-3 text-sm hover:border-[#A87C4F]"
                    >
                      <p className="text-[#1F2430]">{lead.company?.name}</p>
                      <p className="text-xs text-[#6B7280]">{lead.contact?.name}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {lead.priority && (
                          <span className={`rounded-full px-2 py-0.5 text-xs ${TIER_STYLES[lead.priority] ?? ''}`}>
                            {lead.priority} {lead.lead_score !== null ? `(${lead.lead_score})` : ''}
                          </span>
                        )}
                        {needsFollowUp && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                            Needs Follow-Up
                          </span>
                        )}
                      </div>
                      {days !== null && (
                        <p className="mt-1 text-xs text-[#6B7280]">{days}d since last activity</p>
                      )}
                    </Link>
                  )
                })}
                {columnLeads.length === 0 && (
                  <p className="text-xs text-[#6B7280]">No leads</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}