'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { discoverCompanies, addDiscoveredCompany } from '../discover-actions'
import { isSafeUrl } from '@/lib/url'

type Candidate = { name: string; company_type: string; industry: string | null; reason: string; source: string | null }

export default function DiscoverCompanies() {
  const [brief, setBrief] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [added, setAdded] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function search() {
    setError(null)
    setStatus(null)
    startTransition(async () => {
      const result = await discoverCompanies(brief)
      if (result?.error) {
        setError(result.error)
        return
      }
      if (result?.success) {
        setCandidates(result.candidates)
        setDismissed(new Set())
        setAdded(new Set())
        if (result.candidates.length === 0) {
          setStatus('No new companies found matching that brief.')
        }
      }
    })
  }

  function addCandidate(index: number, c: Candidate) {
    if (!c.source) return
    startTransition(async () => {
      const result = await addDiscoveredCompany(c.name, c.company_type, c.industry, c.source!)
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
    <div className="mb-6 rounded border border-black/10 bg-white p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-medium text-[#1B2A44] hover:underline"
      >
        {open ? '− Hide' : '+ Discover New Companies'}
      </button>

      {open && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="e.g. NBFCs expanding recovery operations in India"
              className="flex-1 rounded border border-black/10 px-3 py-2 text-sm"
            />
            <button
              onClick={search}
              disabled={isPending}
              className="rounded bg-[#1B2A44] px-4 py-2 text-sm text-white hover:bg-[#243a5e] disabled:opacity-50"
            >
              {isPending ? 'Searching…' : 'Search'}
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {status && (
            <div className="mt-3 rounded border border-black/10 bg-black/5 p-3 text-sm text-[#6B7280]">{status}</div>
          )}

          {candidates.length > 0 && (
            <ul className="mt-3 space-y-2">
              {candidates.map((c, i) =>
                dismissed.has(i) ? null : (
                  <li key={i} className="rounded border border-black/10 p-3 text-sm flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[#1F2430]">{c.name} <span className="text-[#6B7280]">— {c.company_type}</span></p>
                      <p className="mt-1 text-[#1F2430]">{c.reason}</p>
                      {isSafeUrl(c.source) && (
                        <a href={c.source!} target="_blank" rel="noopener noreferrer" className="text-xs text-[#A87C4F] underline">
                          {c.source}
                        </a>
                      )}
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
                          Add as Company
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
        </div>
      )}
    </div>
  )
}