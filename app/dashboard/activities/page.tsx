import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

const ACTIVITY_BADGE: Record<string, string> = {
  NOTE_ADDED: 'bg-black/5 text-[#6B7280]',
  STATUS_CHANGE: 'bg-blue-100 text-blue-700',
  MESSAGE_DRAFTED: 'bg-amber-100 text-amber-700',
  MARKED_SENT: 'bg-green-100 text-green-700',
  RESPONSE_RECEIVED: 'bg-purple-100 text-purple-700',
  LEAD_SCORED: 'bg-teal-100 text-teal-700',
  CALL: 'bg-black/5 text-[#6B7280]',
  EMAIL: 'bg-black/5 text-[#6B7280]',
  MEETING: 'bg-black/5 text-[#6B7280]',
  OTHER: 'bg-black/5 text-[#6B7280]',
}

const ACTIVITY_LIMIT = 100

export default async function ActivitiesPage() {
  const supabase = await createClient()

  const { data: activities, error } = await supabase
    .from('activities')
    .select('*, lead:leads(id, company:companies(name), contact:contacts(name))')
    .order('created_at', { ascending: false })
    .limit(ACTIVITY_LIMIT)

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
        Couldn&apos;t load activities: {error.message}
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-serif text-xl text-[#1F2430] mb-1">Activities</h2>
      <p className="text-sm text-[#6B7280] mb-4">
        A combined feed of everything logged across all your leads — most recent first (last {ACTIVITY_LIMIT}).
      </p>

      {activities && activities.length > 0 ? (
        <ul className="space-y-2">
          {activities.map((a) => (
            <li key={a.id} className="rounded border border-black/10 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className={`mr-2 rounded px-2 py-0.5 text-xs ${ACTIVITY_BADGE[a.activity_type] ?? 'bg-black/5 text-[#6B7280]'}`}>
                    {a.activity_type}
                  </span>
                  {a.lead ? (
                    <Link href={`/dashboard/leads/${a.lead.id}`} className="text-[#A87C4F] hover:underline">
                      {a.lead.company?.name ?? 'Unknown company'} — {a.lead.contact?.name ?? 'Unknown contact'}
                    </Link>
                  ) : (
                    <span className="text-[#6B7280]">(lead no longer exists)</span>
                  )}
                </div>
                <span className="text-xs text-[#6B7280]">
                  {new Date(a.created_at).toISOString().split('T')[0]}
                </span>
              </div>
              <p className="mt-1 text-[#1F2430]">{a.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#6B7280]">No activity logged yet. Activity will appear here as you work leads.</p>
      )}
    </div>
  )
}