'use client'

import { useState, useTransition } from 'react'
import { generateDraft, saveDraft } from '../message-actions'

function parseSaved(personalizationPoints: string | null): { subject: string; body: string } {
  if (!personalizationPoints) return { subject: '', body: '' }
  const match = personalizationPoints.match(/^Subject: (.*?)\n\n([\s\S]*)$/)
  if (match) return { subject: match[1], body: match[2] }
  return { subject: '', body: personalizationPoints }
}

export default function MessageDraftEditor({
  leadId,
  initialPersonalizationPoints,
}: {
  leadId: string
  initialPersonalizationPoints: string | null
}) {
  const saved = parseSaved(initialPersonalizationPoints)
  const [subject, setSubject] = useState(saved.subject)
  const [body, setBody] = useState(saved.body)
  const [refinement, setRefinement] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  function generate(refine: boolean) {
    setError(null)
    setStatus(null)
    startTransition(async () => {
      const result = await generateDraft(leadId, refine ? refinement : undefined)
      if (result?.error) {
        setError(result.error)
        return
      }
      if (result?.success) {
        setSubject(result.subject)
        setBody(result.body)
        setRefinement('')
        setStatus('Draft generated.')
      }
    })
  }

  function handleSave() {
    setError(null)
    setStatus(null)
    startTransition(async () => {
      const result = await saveDraft(leadId, subject, body)
      if (result?.error) {
        setError(result.error)
        return
      }
      setStatus('Draft saved.')
    })
  }

  function handleCopy() {
    const text = `Subject: ${subject}\n\n${body}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const hasDraft = subject || body

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-lg text-[#1F2430]">Outreach Message Draft</h3>
        <button
          onClick={() => generate(false)}
          disabled={isPending}
          className="rounded bg-[#1B2A44] px-4 py-2 text-sm text-white hover:bg-[#243a5e] disabled:opacity-50"
        >
          {isPending ? 'Working…' : hasDraft ? 'Regenerate Draft' : 'Generate Draft'}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {status && (
        <div className="mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{status}</div>
      )}

      {hasDraft ? (
        <div className="rounded border border-black/10 bg-white p-4 space-y-3">
          <div>
            <label className="block text-sm text-[#6B7280]">Subject Line</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-[#6B7280]">Message Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              placeholder="e.g. Focus more on the call centre capabilities…"
              className="flex-1 rounded border border-black/10 px-3 py-2 text-sm"
            />
            <button
              onClick={() => generate(true)}
              disabled={isPending || !refinement.trim()}
              className="rounded border border-black/10 px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-50"
            >
              Refine Draft
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded bg-[#A87C4F] px-4 py-2 text-sm text-white hover:bg-[#946a42] disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={handleCopy}
              className="rounded border border-black/10 px-4 py-2 text-sm hover:bg-black/5"
            >
              {copied ? '✓ Copied' : 'Copy Message'}
            </button>
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-[#6B7280]">
              📎 Corporate Profile PDF attached by default
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#6B7280]">
          No draft yet. Click &quot;Generate Draft&quot; to create a personalized outreach message.
        </p>
      )}
    </section>
  )
}