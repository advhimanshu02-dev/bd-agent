import { createClient } from '@/utils/supabase/server'
import OutreachClient from './_components/outreach-client'
import { DEFAULT_FOLLOWUP_DAYS } from '@/lib/constants'
import { canOutreach } from '@/lib/pipeline'

export default async function OutreachPage() {
  const supabase = await createClient()

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*, company:companies(id, name), contact:contacts(id, name, designation, linkedin_url, do_not_contact)')
    .not('personalization_points', 'is', null)
    .order('priority', { ascending: true })
    .order('lead_score', { ascending: false })

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
        Couldn&apos;t load the outreach queue: {error.message}
      </div>
    )
  }

  const allLeads = leads ?? []
  const leadIds = allLeads.map((l) => l.id)

  const { data: activities } = leadIds.length
    ? await supabase
        .from('activities')
        .select('lead_id, created_at')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const lastActivityByLead = new Map<string, string>()
  for (const a of activities ?? []) {
    if (!lastActivityByLead.has(a.lead_id)) {
      lastActivityByLead.set(a.lead_id, a.created_at)
    }
  }

  const thresholdMs = DEFAULT_FOLLOWUP_DAYS * 24 * 60 * 60 * 1000
  // eslint-disable-next-line react-hooks/purity -- Server Component runs once per request; Date.now() here is a legitimate per-request snapshot, not a re-render impurity.
  const now = Date.now()

  const queue = allLeads.filter((l) => {
    if (l.contact?.do_not_contact) return false

    if (canOutreach(l.status)) return true

    if (l.status === 'CONTACTED') {
      const last = lastActivityByLead.get(l.id)
      const isStale = !last || now - new Date(last).getTime() > thresholdMs
      return isStale
    }

    return false
  })

  return <OutreachClient leads={queue} />
}