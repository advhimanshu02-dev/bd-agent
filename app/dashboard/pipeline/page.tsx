import { createClient } from '@/utils/supabase/server'
import PipelineBoard from './_components/pipeline-board'
import { PIPELINE_STAGE_KEYS } from '@/lib/pipeline'

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*, company:companies(id, name), contact:contacts(id, name)')
    .in('status', PIPELINE_STAGE_KEYS)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
        Couldn&apos;t load the pipeline: {error.message}
      </div>
    )
  }

  const leadIds = (leads ?? []).map((l) => l.id)

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

  return (
    <PipelineBoard
      leads={leads ?? []}
      lastActivityByLead={Object.fromEntries(lastActivityByLead)}
    />
  )
}