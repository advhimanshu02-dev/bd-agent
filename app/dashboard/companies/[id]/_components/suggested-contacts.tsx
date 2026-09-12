'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { findContacts, addSuggestedContact } from '../find-contacts-actions'
import { isSafeUrl } from '@/lib/url'

type Candidate = { name: string; designation: string; source: string | null }

export default function SuggestedContacts({ companyId }: { companyId: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [added, setAdded] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function search() {
    setError(null)
    setStatus(null)
    startTransition(async () => {
      const result = await findContacts(companyId)
      if (result?.error) {
        setError(result.error)
        return
      }
      if (result?.success) {
        setCandidates(result.candidates)
        setDismissed(new Set())
        setAdded(new Set())
        if (result.candidates.length === 0) {
          setStatus('No reliable candidates found from public sources.')
        }
      }
    })
  }

  function addCandidate(index: number, c: Candidate) {
    if (!c.source) return
    startTransition(async () => {
      const result = await addSuggestedContact(companyId, c.name, c.designation, c.source!)
      if (result?.error) {
        setError(result.error)
        return
      }
      setAdded((prev) => new Set(prev).add(index))
      router.refresh()
    })
  }

  function dismissCandidate(index: number) {
    setDismissed((prev) => new Set(prev).add(index))
  }

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-lg text-[#1F2430]">Suggested Contacts</h3>
        <button
          onClick={search}
          disabled={isPending}
          className="rounded bg-[#1B2A44] px-4 py-2 text-sm text-white hover:bg-[#243a5e] disabled:opacity-50"
        >
          {isPending ? 'Searching…' : 'Find Contacts'}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {status && (
        <div className="mb-3 rounded border border-black/10 bg-white p-3 text-sm text-[#6B7280]">{status}</div>
      )}

      {candidates.length > 0 && (
        <ul className="space-y-2">
          {candidates.map((c, i) =>
            dismissed.has(i) ? null : (
              <li key={i} className="rounded border border-black/10 bg-white p-3 text-sm flex items-center justify-between gap-3">
                <div>
                  <p className="text-[#1F2430]">{c.name} — {c.designation}</p>
                  {isSafeUrl(c.source) ? (
                    <a href={c.source!} target="_blank" rel="noopener noreferrer" className="text-xs text-[#A87C4F] underline">
                      {c.source}
                    </a>
                  ) : null}
                  <p className="text-xs text-amber-700 mt-1">Requires verification — not yet confirmed</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {added.has(i) ? (
                    <span className="text-xs text-green-700">✓ Added</span>
                  ) : (
                    <button
                      onClick={() => addCandidate(i, c)}
                      disabled={isPending}
                      className="rounded bg-[#A87C4F] px-3 py-1.5 text-xs text-white hover:bg-[#946a42] disabled:opacity-50"
                    >
                      Add as Contact
                    </button>
                  )}
                  <button
                    onClick={() => dismissCandidate(i)}
                    className="rounded border border-black/10 px-3 py-1.5 text-xs hover:bg-black/5"
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </section>
  )
}