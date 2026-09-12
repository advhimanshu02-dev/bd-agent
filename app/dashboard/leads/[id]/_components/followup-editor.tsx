'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateFollowUp } from '../followup-actions'

export default function FollowUpEditor({ leadId }: { leadId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      const result = await generateFollowUp(leadId)
      if (result?.error) {
        setError(result.error)
        return
      }
      if (result?.success) {
        setPreview({ subject: result.subject, body: result.body })
        router.refresh()
      }
    })
  }

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-lg text-[#1F2430]">Follow-Up</h3>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="rounded bg-[#1B2A44] px-4 py-2 text-sm text-white hover:bg-[#243a5e] disabled:opacity-50"
        >
          {isPending ? 'Drafting…' : 'Draft Follow-Up'}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {preview && (
        <div className="rounded border border-black/10 bg-white p-4 text-sm">
          <p className="mb-2"><span className="text-[#6B7280]">Subject:</span> {preview.subject}</p>
          <p className="whitespace-pre-wrap text-[#1F2430]">{preview.body}</p>
          <p className="mt-3 text-xs text-[#6B7280]">
            Saved to this lead&apos;s message draft — edit it in the Outreach Message Draft section above, or find it in the Outreach Queue.
          </p>
        </div>
      )}
    </section>
  )
}