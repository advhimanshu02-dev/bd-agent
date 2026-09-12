'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { scoreLead } from '../scoring-actions'

type Props = {
  leadId: string
  initialScore: number | null
  initialPriority: string | null
  initialReason: string | null
  findingsCount: number
}

const TIER_STYLES: Record<string, string> = {
  HOT: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  WARM: 'bg-amber-100 text-amber-800 border-amber-300',
  COLD: 'bg-slate-100 text-slate-700 border-slate-300',
}

export default function LeadScoreCard({
  leadId,
  initialScore,
  initialPriority,
  initialReason,
  findingsCount,
}: Props) {
  const [score, setScore] = useState(initialScore)
  const [priority, setPriority] = useState(initialPriority)
  const [reason, setReason] = useState(initialReason)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function runScoring() {
    setError(null)
    startTransition(async () => {
      const result = await scoreLead(leadId)
      if (result?.error) {
        setError(result.error)
        return
      }
      if (result?.success) {
        setScore(result.score)
        setPriority(result.tier)
        setReason(
          [
            result.summary_reason,
            '',
            'Key reasons:',
            ...result.key_reasons.map((r) => `- ${r}`),
            '',
            'Recommended actions:',
            ...result.recommended_actions.map((a) => `- ${a}`),
          ].join('\n')
        )
        router.refresh()
      }
    })
  }

  const tierClass = priority ? TIER_STYLES[priority] ?? TIER_STYLES.COLD : ''

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-lg text-[#1F2430]">Lead Score</h3>
        <button
          onClick={runScoring}
          disabled={isPending || findingsCount === 0}
          title={findingsCount === 0 ? 'Run AI Research first' : undefined}
          className="rounded bg-[#1B2A44] px-4 py-2 text-sm text-white hover:bg-[#243a5e] disabled:opacity-50"
        >
          {isPending ? 'Scoring…' : score !== null ? 'Re-score Lead' : 'Score Lead'}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {score !== null ? (
        <div className={`rounded border p-4 ${tierClass}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-lg font-serif ${tierClass}`}>
              {score}
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tierClass}`}>
              {priority}
            </span>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-[#1F2430]">{reason}</pre>
        </div>
      ) : (
        <p className="text-sm text-[#6B7280]">
          {findingsCount === 0
            ? 'Run AI Research first, then score this lead.'
            : 'Not scored yet. Click "Score Lead" to generate a score.'}
        </p>
      )}
    </section>
  )
}