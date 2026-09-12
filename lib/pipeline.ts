export const PIPELINE_STAGES = [
  { key: 'RESEARCH', label: 'Research', order: 1, description: 'Prospect is being researched.', onBoard: true, actionable: true, terminal: false, allowOutreach: false },
  { key: 'TARGET_IDENTIFIED', label: 'Target Identified', order: 2, description: 'Company confirmed as a target.', onBoard: true, actionable: true, terminal: false, allowOutreach: false },
  { key: 'DECISION_MAKER_IDENTIFIED', label: 'Decision-Maker Identified', order: 3, description: 'A relevant person has been identified.', onBoard: true, actionable: true, terminal: false, allowOutreach: false },
  { key: 'QUALIFIED', label: 'Qualified', order: 4, description: 'Opportunity meets qualification criteria.', onBoard: true, actionable: true, terminal: false, allowOutreach: false },
  { key: 'READY_TO_CONTACT', label: 'Ready to Contact', order: 5, description: 'Sufficient intelligence exists to prepare outreach.', onBoard: true, actionable: true, terminal: false, allowOutreach: true },
  { key: 'CONTACTED', label: 'Contacted', order: 6, description: 'Himanshu has actually sent the communication.', onBoard: true, actionable: true, terminal: false, allowOutreach: false },
  { key: 'RESPONSE_RECEIVED', label: 'Response Received', order: 7, description: 'A response has actually been received.', onBoard: true, actionable: true, terminal: false, allowOutreach: false },
  { key: 'INTERESTED', label: 'Interested', order: 8, description: 'Response indicates genuine interest.', onBoard: true, actionable: true, terminal: false, allowOutreach: false },
  { key: 'MEETING', label: 'Meeting', order: 9, description: 'Meeting/discussion scheduled or occurring.', onBoard: true, actionable: true, terminal: false, allowOutreach: false },
  { key: 'PROPOSAL', label: 'Proposal', order: 10, description: 'A proposal has been sent.', onBoard: true, actionable: true, terminal: false, allowOutreach: false },
  { key: 'NEGOTIATION', label: 'Negotiation', order: 11, description: 'Commercial/service discussions underway.', onBoard: true, actionable: true, terminal: false, allowOutreach: false },
  { key: 'VENDOR_ONBOARDING', label: 'Vendor Onboarding', order: 12, description: 'Proceeding through vendor onboarding.', onBoard: true, actionable: true, terminal: false, allowOutreach: false },
  { key: 'WON', label: 'Won', order: 13, description: 'Prospect became a client.', onBoard: true, actionable: false, terminal: true, allowOutreach: false },
  { key: 'LOST', label: 'Lost', order: 14, description: 'Opportunity closed/lost.', onBoard: true, actionable: false, terminal: true, allowOutreach: false },
] as const

export type PipelineStageKey = typeof PIPELINE_STAGES[number]['key']
export const PIPELINE_STAGE_KEYS = PIPELINE_STAGES.map((s) => s.key) as PipelineStageKey[]

export function stageLabel(key: string): string {
  return PIPELINE_STAGES.find((s) => s.key === key)?.label ?? key
}

export function canOutreach(key: string): boolean {
  return PIPELINE_STAGES.find((s) => s.key === key)?.allowOutreach ?? false
}