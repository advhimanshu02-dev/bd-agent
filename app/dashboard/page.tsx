import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { rankLeads } from '@/lib/priority'
import { stageLabel } from '@/lib/pipeline'

async function getCounts() {
  const supabase = await createClient()

  const [companies, contacts, leads, highPriorityLeads] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('priority', 'HIGH'),
  ])

  return {
    companies: companies.count ?? 0,
    contacts: contacts.count ?? 0,
    leads: leads.count ?? 0,
    highPriorityLeads: highPriorityLeads.count ?? 0,
  }
}

async function getTodaysPriority() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('*, company:companies(id, name), contact:contacts(id, name, do_not_contact)')
    .not('status', 'in', '(WON,LOST)')

  const leadIds = (leads ?? []).map((l) => l.id)

  const [{ data: activities }, { data: findings }] = await Promise.all([
    leadIds.length
      ? supabase.from('activities').select('lead_id, created_at').in('lead_id', leadIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as { lead_id: string; created_at: string }[] }),
    leadIds.length
      ? supabase.from('research_findings').select('lead_id').in('lead_id', leadIds)
      : Promise.resolve({ data: [] as { lead_id: string }[] }),
  ])

  const lastActivityByLead: Record<string, string> = {}
  for (const a of activities ?? []) {
    if (!lastActivityByLead[a.lead_id]) lastActivityByLead[a.lead_id] = a.created_at
  }

  const researchCountByLead: Record<string, number> = {}
  for (const f of findings ?? []) {
    researchCountByLead[f.lead_id] = (researchCountByLead[f.lead_id] ?? 0) + 1
  }

  const enriched = (leads ?? []).map((l) => ({
    id: l.id,
    status: l.status,
    lead_score: l.lead_score,
    priority: l.priority,
    company: l.company,
    contact: l.contact,
    research_count: researchCountByLead[l.id] ?? 0,
  }))

  return rankLeads(enriched, lastActivityByLead).slice(0, 5)
}

export default async function DashboardPage() {
  const [counts, priorityItems] = await Promise.all([getCounts(), getTodaysPriority()])

  const cards = [
    { label: 'Total Companies', value: counts.companies },
    { label: 'Total Contacts', value: counts.contacts },
    { label: 'Total Leads', value: counts.leads },
    { label: 'High Priority Leads', value: counts.highPriorityLeads },
  ]

  return (
    <div>
      <section className="mb-8">
        <h2 className="mb-1 font-serif text-xl text-[#1F2430]">Today&apos;s Priority</h2>
        <p className="mb-4 text-sm text-[#6B7280]">
          {priorityItems.length === 0 ? 'Nothing needs attention right now.' : `${priorityItems.length} action${priorityItems.length === 1 ? '' : 's'} worth your attention`}
        </p>

        {priorityItems.length === 0 ? (
          <div className="rounded border border-black/10 bg-white p-6 text-center text-sm text-[#6B7280]">
            No active opportunities need action right now. Add leads or run research to populate this queue.
          </div>
        ) : (
          <ol className="space-y-2">
            {priorityItems.map((item, i) => (
              <li key={item.lead.id} className="rounded border border-black/10 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[#1F2430]">
                      <span className="font-serif text-base">#{i + 1} {item.lead.company?.name}</span>
                      {' — '}{item.lead.contact?.name}
                      <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs text-[#6B7280]">
                        {stageLabel(item.lead.status)}
                      </span>
                      {item.lead.priority && (
                        <span className="ml-2 rounded-full bg-[#A87C4F]/10 px-2 py-0.5 text-xs text-[#A87C4F]">
                          {item.lead.priority}{item.lead.lead_score !== null ? ` (${item.lead.lead_score})` : ''}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-[#1F2430]">{item.whyNow}</p>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      <span className="font-medium text-[#1F2430]">Next action:</span> {item.nextAction}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/leads/${item.lead.id}`}
                    className="shrink-0 rounded bg-[#A87C4F] px-4 py-2 text-sm text-white hover:bg-[#946a42]"
                  >
                    Open Lead
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <h2 className="mb-4 font-serif text-xl text-[#1F2430]">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded border border-black/10 bg-white p-5">
            <p className="text-sm text-[#6B7280]">{card.label}</p>
            <p className="mt-2 font-serif text-3xl text-[#1F2430]">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}