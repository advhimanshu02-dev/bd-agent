'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { logResponse } from '../response-actions'

export default function ResponseLog({ leadId }: { leadId: string }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ classification: string; suggestedNextStep: string; newStatus: string | null } | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit() {
    setError(null)
    setResult(null)
    setWarning(null)
    startTransition(async () => {
      const res = await logResponse(leadId, text)
      if (res?.error) {
        setError(res.error)
        return
      }
      if (res?.warning) setWarning(res.warning)
      if (res?.classification) {
        setResult({
          classification: res.classification,
          suggestedNextStep: res.suggestedNextStep,
          newStatus: res.newStatus,
        })
      }
      setText('')
      router.refresh()
    })
  }

  return (
    <section className="mb-6">
      <h3 className="font-serif text-lg text-[#1F2430] mb-2">Log a Response</h3>
      <div className="rounded border border-black/10 bg-white p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste what the prospect replied…"
          rows={3}
          className="w-full rounded border border-black/10 px-3 py-2 text-sm"
        />
        <button
          onClick={handleSubmit}
          disabled={isPending || !text.trim()}
          className="mt-2 rounded bg-[#1B2A44] px-4 py-2 text-sm text-white hover:bg-[#243a5e] disabled:opacity-50"
        >
          {isPending ? 'Logging…' : 'Log Response'}
        </button>

        {error && (
          <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {warning && (
          <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>
        )}
        {result && (
          <div className="mt-3 rounded border border-black/10 bg-black/5 p-3 text-sm">
            <p><span className="text-[#6B7280]">Classification:</span> {result.classification}</p>
            <p><span className="text-[#6B7280]">Suggested next step:</span> {result.suggestedNextStep}</p>
            {result.newStatus && (
              <p><span className="text-[#6B7280]">Status updated to:</span> {result.newStatus}</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}