import { DEFAULT_FOLLOWUP_DAYS } from './constants'

type Lead = {
  id: string
  status: string
  lead_score: number | null
  priority: string | null
  company: { id: string; name: string } | null
  contact: { id: string; name: string; do_not_contact: boolean } | null
  research_count: number
}

const STAGE_BASE_POINTS: Record<string, number> = {
  INTERESTED: 90,
  MEETING: 88,
  RESPONSE_RECEIVED: 82,
  NEGOTIATION: 78,
  PROPOSAL: 70,
  VENDOR_ONBOARDING: 65,
  READY_TO_CONTACT: 55,
  DECISION_MAKER_IDENTIFIED: 45,
  CONTACTED: 40,
  QUALIFIED: 35,
  TARGET_IDENTIFIED: 25,
  RESEARCH: 15,
}

const NEXT_ACTION: Record<string, string> = {
  INTERESTED: 'Review their interest and prepare a meeting follow-up.',
  MEETING: 'Prepare for the upcoming meeting/discussion.',
  RESPONSE_RECEIVED: 'Review the response and decide the next step.',
  NEGOTIATION: 'Continue the commercial/service discussion.',
  PROPOSAL: 'Follow up on the sent proposal.',
  VENDOR_ONBOARDING: 'Move the onboarding forward.',
  READY_TO_CONTACT: 'Send the first outreach message.',
  DECISION_MAKER_IDENTIFIED: 'Qualify the opportunity and prepare outreach.',
  CONTACTED: 'Follow up — no response yet.',
  QUALIFIED: 'Identify the right decision-maker.',
  TARGET_IDENTIFIED: 'Find and confirm the right decision-maker.',
  RESEARCH: 'Continue researching this company.',
}

const WHY_NOW: Record<string, string> = {
  INTERESTED: 'Interested response received — act while attention is fresh.',
  MEETING: 'A meeting is scheduled or requested.',
  RESPONSE_RECEIVED: 'They responded and are waiting to hear back.',
  NEGOTIATION: 'Active commercial discussion in progress.',
  PROPOSAL: 'Proposal sent — a timely follow-up keeps momentum.',
  VENDOR_ONBOARDING: 'Onboarding in progress — keep it moving.',
  READY_TO_CONTACT: 'Enough intelligence exists to reach out now.',
  DECISION_MAKER_IDENTIFIED: 'A relevant contact is identified and ready to qualify.',
  CONTACTED: 'Sent, but going stale without a reply.',
  QUALIFIED: 'Opportunity qualified — needs a named contact.',
  TARGET_IDENTIFIED: 'Confirmed target — needs a decision-maker.',
  RESEARCH: 'Still being researched.',
}

export type PriorityItem = {
  lead: Lead
  score: number
  whyNow: string
  nextAction: string
  isStale: boolean
}

export function rankLeads(leads: Lead[], lastActivityByLead: Record<string, string>): PriorityItem[] {
 
  const now = Date.now()

  const eligible = leads.filter((l) => {
    if (l.status === 'WON' || l.status === 'LOST') return false
    if (l.contact?.do_not_contact) return false
    return true
  })

  const scored: PriorityItem[] = eligible.map((lead) => {
    const base = STAGE_BASE_POINTS[lead.status] ?? 10
    const scoreBonus = lead.lead_score ? Math.round(lead.lead_score / 10) : 0
    const researchBonus = lead.research_count > 0 ? 5 : 0

    const lastActivity = lastActivityByLead[lead.id]
    const daysSinceActivity = lastActivity ? (now - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24) : null
    const isStale = lead.status === 'CONTACTED' && (daysSinceActivity === null || daysSinceActivity > DEFAULT_FOLLOWUP_DAYS)
    const staleBonus = isStale ? 15 : 0

    const total = base + scoreBonus + researchBonus + staleBonus

    return {
      lead,
      score: total,
      whyNow: WHY_NOW[lead.status] ?? 'Active opportunity worth reviewing.',
      nextAction: NEXT_ACTION[lead.status] ?? 'Review this lead and decide the next step.',
      isStale,
    }
  })

  return scored.sort((a, b) => b.score - a.score)
}