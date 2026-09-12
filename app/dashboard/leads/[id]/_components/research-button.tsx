'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { researchLead } from '../research-actions'

export default function ResearchButton({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const router = useRouter()

  function runResearch(force: boolean) {
    setMessage(null)
    startTransition(async () => {
      const result = await researchLead(leadId, force)

      if (result?.needsConfirmation) {
        setConfirming(true)
        return
      }
      setConfirming(false)

      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
        return
      }

      if (result?.success) {
        setMessage({
          type: 'success',
          text: `Added ${result.count} finding${result.count === 1 ? '' : 's'}. Estimated cost: $${result.cost?.toFixed(4)}.`,
        })
        router.refresh()
      }
    })
  }

  return (
    <div>
      <button
        onClick={() => runResearch(false)}
        disabled={isPending}
        className="rounded bg-[#1B2A44] px-4 py-2 text-sm text-white hover:bg-[#243a5e] disabled:opacity-50"
      >
        {isPending ? 'Researching…' : 'Research Lead'}
      </button>

      {confirming && (
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          This lead already has research from the last 7 days.{' '}
          <button onClick={() => runResearch(true)} className="font-medium underline" disabled={isPending}>
            Research again anyway
          </button>
        </div>
      )}

      {message && (
        <div
          className={`mt-3 rounded p-3 text-sm ${
            message.type === 'error'
              ? 'border border-red-200 bg-red-50 text-red-700'
              : 'border border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}