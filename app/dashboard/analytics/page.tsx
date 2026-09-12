import { createClient } from '@/utils/supabase/server'
import { stageLabel } from '@/lib/pipeline'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const [{ data: leads }, { data: companies }, { data: aiUsage }] = await Promise.all([
    supabase.from('leads').select('status, priority, converted'),
    supabase.from('companies').select('lending_category'),
    supabase.from('ai_usage').select('operation, estimated_cost'),
  ])

  const totalLeads = leads?.length ?? 0
  const convertedCount = (leads ?? []).filter((l) => l.converted).length
  const conversionRate = totalLeads > 0 ? ((convertedCount / totalLeads) * 100).toFixed(1) : '0.0'

  const statusCounts: Record<string, number> = {}
  const priorityCounts: Record<string, number> = {}
  for (const l of leads ?? []) {
    statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1
    if (l.priority) priorityCounts[l.priority] = (priorityCounts[l.priority] ?? 0) + 1
  }

  const categoryCounts: Record<string, number> = {}
  for (const c of companies ?? []) {
    const key = c.lending_category || 'Uncategorized'
    categoryCounts[key] = (categoryCounts[key] ?? 0) + 1
  }

  const operationCounts: Record<string, number> = {}
  let totalCost = 0
  for (const u of aiUsage ?? []) {
    operationCounts[u.operation] = (operationCounts[u.operation] ?? 0) + 1
    totalCost += Number(u.estimated_cost) || 0
  }

  return (
    <div>
      <h2 className="mb-4 font-serif text-xl text-[#1F2430]">Analytics</h2>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded border border-black/10 bg-white p-5">
          <p className="text-sm text-[#6B7280]">Total Leads</p>
          <p className="mt-2 font-serif text-3xl text-[#1F2430]">{totalLeads}</p>
        </div>
        <div className="rounded border border-black/10 bg-white p-5">
          <p className="text-sm text-[#6B7280]">Converted</p>
          <p className="mt-2 font-serif text-3xl text-[#1F2430]">{convertedCount}</p>
        </div>
        <div className="rounded border border-black/10 bg-white p-5">
          <p className="text-sm text-[#6B7280]">Conversion Rate</p>
          <p className="mt-2 font-serif text-3xl text-[#1F2430]">{conversionRate}%</p>
        </div>
        <div className="rounded border border-black/10 bg-white p-5">
          <p className="text-sm text-[#6B7280]">Total AI Spend</p>
          <p className="mt-2 font-serif text-3xl text-[#1F2430]">${totalCost.toFixed(4)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section>
          <h3 className="font-serif text-lg text-[#1F2430] mb-2">Leads by Status</h3>
          <div className="rounded border border-black/10 bg-white p-4 text-sm space-y-1">
            {Object.keys(statusCounts).length === 0 ? (
              <p className="text-[#6B7280]">No leads yet.</p>
            ) : (
              Object.entries(statusCounts).map(([status, count]) => (
                <p key={status}><span className="text-[#6B7280]">{stageLabel(status)}:</span> {count}</p>
              ))
            )}
          </div>
        </section>

        <section>
          <h3 className="font-serif text-lg text-[#1F2430] mb-2">Leads by Priority</h3>
          <div className="rounded border border-black/10 bg-white p-4 text-sm space-y-1">
            {Object.keys(priorityCounts).length === 0 ? (
              <p className="text-[#6B7280]">No scored leads yet.</p>
            ) : (
              Object.entries(priorityCounts).map(([priority, count]) => (
                <p key={priority}><span className="text-[#6B7280]">{priority}:</span> {count}</p>
              ))
            )}
          </div>
        </section>

        <section>
          <h3 className="font-serif text-lg text-[#1F2430] mb-2">Companies by Lending Category</h3>
          <div className="rounded border border-black/10 bg-white p-4 text-sm space-y-1">
            {Object.entries(categoryCounts).map(([cat, count]) => (
              <p key={cat}><span className="text-[#6B7280]">{cat}:</span> {count}</p>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-serif text-lg text-[#1F2430] mb-2">AI Usage by Operation</h3>
          <div className="rounded border border-black/10 bg-white p-4 text-sm space-y-1">
            {Object.keys(operationCounts).length === 0 ? (
              <p className="text-[#6B7280]">No AI operations run yet.</p>
            ) : (
              Object.entries(operationCounts).map(([op, count]) => (
                <p key={op}><span className="text-[#6B7280]">{op}:</span> {count}</p>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}