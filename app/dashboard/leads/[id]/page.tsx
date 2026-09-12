import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { addActivity } from './actions'
import ResearchButton from './_components/research-button'
import LeadScoreCard from './_components/lead-score-card'
import MessageDraftEditor from './_components/message-draft-editor'
import ResponseLog from './_components/response-log'
import FollowUpEditor from './_components/followup-editor'
import { isSafeUrl } from '@/lib/url'

const ACTIVITY_TYPES = ['NOTE_ADDED', 'STATUS_CHANGE', 'MESSAGE_DRAFTED', 'MARKED_SENT', 'CALL', 'EMAIL', 'MEETING', 'OTHER']

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*, company:companies(*), contact:contacts(*)')
    .eq('id', id)
    .single()

  if (leadError || !lead) notFound()

  const [{ data: findings }, { data: activities }] = await Promise.all([
    supabase.from('research_findings').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('activities').select('*').eq('lead_id', id).order('created_at', { ascending: true }),
  ])

  async function handleAddActivity(formData: FormData) {
    'use server'
    await addActivity(id, formData)
  }

  const findingBadge: Record<string, string> = {
    FACT: 'bg-green-100 text-green-700',
    INFERENCE: 'bg-amber-100 text-amber-700',
    UNKNOWN: 'bg-black/5 text-[#6B7280]',
  }

  const isDoNotContact = Boolean(lead.contact?.do_not_contact)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/dashboard/leads" className="text-sm text-[#A87C4F] hover:underline">&larr; Back to Leads</Link>
        <Link
          href={`/dashboard/leads?edit=${lead.id}`}
          className="rounded bg-[#A87C4F] px-4 py-2 text-sm text-white hover:bg-[#946a42]"
        >
          Edit Lead
        </Link>
      </div>

      <h2 className="font-serif text-xl text-[#1F2430] mb-4">
        {lead.company?.name} — {lead.contact?.name}
      </h2>

      <section className="mb-6">
        <h3 className="font-serif text-lg text-[#1F2430] mb-2">Lead Overview</h3>
        <div className="rounded border border-black/10 bg-white p-4 text-sm grid grid-cols-1 md:grid-cols-2 gap-y-1">
          <p><span className="text-[#6B7280]">Contact Name:</span> {lead.contact?.name}</p>
          <p><span className="text-[#6B7280]">Designation:</span> {lead.contact?.designation || '—'}</p>
          <p><span className="text-[#6B7280]">Company:</span> {lead.company?.name}</p>
          <p><span className="text-[#6B7280]">Status:</span> {lead.status}</p>
          <p><span className="text-[#6B7280]">Lead Score:</span> {lead.lead_score ?? '—'}</p>
          <p><span className="text-[#6B7280]">Priority:</span> {lead.priority || '—'}</p>
          <p><span className="text-[#6B7280]">Potential Requirement:</span> {lead.potential_requirement || '—'}</p>
          <p><span className="text-[#6B7280]">Relevant Service:</span> {lead.relevant_service || '—'}</p>
          <p><span className="text-[#6B7280]">Interested:</span> {lead.interested === null ? '—' : lead.interested ? 'Yes' : 'No'}</p>
          <p><span className="text-[#6B7280]">Meeting Requested:</span> {lead.meeting_requested ? 'Yes' : 'No'}</p>
          <p><span className="text-[#6B7280]">Proposal Sent:</span> {lead.proposal_sent ? 'Yes' : 'No'}</p>
          <p><span className="text-[#6B7280]">Converted:</span> {lead.converted ? 'Yes' : 'No'}</p>
          <p><span className="text-[#6B7280]">Lost Reason:</span> {lead.lost_reason || '—'}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <section>
          <h3 className="font-serif text-lg text-[#1F2430] mb-2">Company Information</h3>
          <div className="rounded border border-black/10 bg-white p-4 text-sm space-y-1">
            <p><span className="text-[#6B7280]">Name:</span> {lead.company?.name}</p>
            <p><span className="text-[#6B7280]">Type:</span> {lead.company?.company_type || '—'}</p>
            <p><span className="text-[#6B7280]">Industry:</span> {lead.company?.industry || '—'}</p>
            <p><span className="text-[#6B7280]">Headquarters:</span> {lead.company?.headquarters || '—'}</p>
            <p><span className="text-[#6B7280]">Size:</span> {lead.company?.size || '—'}</p>
            <p><span className="text-[#6B7280]">Lending Category:</span> {lead.company?.lending_category || '—'}</p>
            <p>
              <span className="text-[#6B7280]">Website:</span>{' '}
              {isSafeUrl(lead.company?.website) ? (
                <a href={lead.company.website} target="_blank" rel="noopener noreferrer" className="text-[#A87C4F] underline">{lead.company.website}</a>
              ) : '—'}
            </p>
          </div>
        </section>

        <section>
          <h3 className="font-serif text-lg text-[#1F2430] mb-2">Contact Information</h3>
          <div className="rounded border border-black/10 bg-white p-4 text-sm space-y-1">
            <p><span className="text-[#6B7280]">Name:</span> {lead.contact?.name}</p>
            <p><span className="text-[#6B7280]">Designation:</span> {lead.contact?.designation || '—'}</p>
            <p><span className="text-[#6B7280]">Department:</span> {lead.contact?.department || '—'}</p>
            <p>
              <span className="text-[#6B7280]">LinkedIn:</span>{' '}
              {isSafeUrl(lead.contact?.linkedin_url) ? (
                <a href={lead.contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#A87C4F] underline">Profile</a>
              ) : '—'}
            </p>
            <p><span className="text-[#6B7280]">Email:</span> {lead.contact?.email || '—'}</p>
            <p><span className="text-[#6B7280]">Phone:</span> {lead.contact?.phone || '—'}</p>
            <p><span className="text-[#6B7280]">Location:</span> {lead.contact?.location || '—'}</p>
            <p><span className="text-[#6B7280]">Decision Maker Category:</span> {lead.contact?.decision_maker_category || '—'}</p>
            <p><span className="text-[#6B7280]">Verification Status:</span> {lead.contact?.verification_status || '—'}</p>
            <p>
              <span className="text-[#6B7280]">Do Not Contact:</span>{' '}
              {isDoNotContact ? (
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Yes</span>
              ) : 'No'}
            </p>
          </div>
        </section>
      </div>

      <LeadScoreCard
        leadId={lead.id}
        initialScore={lead.lead_score}
        initialPriority={lead.priority}
        initialReason={lead.score_reason}
        findingsCount={findings?.length ?? 0}
      />

      {isDoNotContact ? (
        <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          This contact is marked <strong>Do Not Contact</strong>. Outreach and follow-up drafting are disabled for this lead.
        </div>
      ) : (
        <>
          <MessageDraftEditor
            leadId={lead.id}
            initialPersonalizationPoints={lead.personalization_points}
          />

          <ResponseLog leadId={lead.id} />

          <FollowUpEditor leadId={lead.id} />
        </>
      )}

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-serif text-lg text-[#1F2430]">Research Findings</h3>
          <ResearchButton leadId={lead.id} />
        </div>
        {findings && findings.length > 0 ? (
          <ul className="space-y-2">
            {findings.map((f) => (
              <li key={f.id} className="rounded border border-black/10 bg-white p-3 text-sm">
                <span className={`mr-2 rounded px-2 py-0.5 text-xs ${findingBadge[f.finding_type] ?? 'bg-black/5'}`}>
                  {f.finding_type}
                </span>
                {f.content}
                {isSafeUrl(f.source) && (
                  <>
                    {' '}
                    <a href={f.source} target="_blank" rel="noopener noreferrer" className="text-[#A87C4F] underline">source</a>
                  </>
                )}
                <span className="ml-2 text-[#6B7280]">— {new Date(f.created_at).toISOString().split('T')[0]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#6B7280]">No research findings yet. Click &quot;Research Lead&quot; to get started.</p>
        )}
      </section>

      <section>
        <h3 className="font-serif text-lg text-[#1F2430] mb-2">Activities</h3>
        {activities && activities.length > 0 ? (
          <ul className="mb-3 space-y-2">
            {activities.map((a) => (
              <li key={a.id} className="rounded border border-black/10 bg-white p-3 text-sm">
                <span className="mr-2 rounded bg-black/5 px-2 py-0.5 text-xs">{a.activity_type}</span>
                {a.description}
                <span className="ml-2 text-[#6B7280]">— {new Date(a.created_at).toISOString().split('T')[0]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-sm text-[#6B7280]">No activity yet.</p>
        )}

        <form action={handleAddActivity} className="rounded border border-black/10 bg-white p-4 flex flex-col md:flex-row gap-3">
          <select name="activity_type" required className="rounded border border-black/10 px-3 py-2 text-sm">
            {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            name="description"
            required
            placeholder="Describe this activity…"
            className="flex-1 rounded border border-black/10 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded bg-[#A87C4F] px-4 py-2 text-sm text-white hover:bg-[#946a42]">
            Add Activity
          </button>
        </form>
      </section>
    </div>
  )
}