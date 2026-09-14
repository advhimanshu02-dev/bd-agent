'use client'

import { useState } from 'react'
import { researchLead } from '../research-actions'
import { scoreLead } from '../scoring-actions'
import { generateDraft, saveDraft } from '../message-actions'

type Step = 'idle' | 'researching' | 'needs-confirm' | 'scoring' | 'low-score-confirm' | 'drafting' | 'done' | 'error'

const STEP_LABEL: Record<Step, string> = {
  idle: '',
  researching: 'Searching the web for company & contact info…',
  'needs-confirm': '',
  scoring: 'Scoring relevance…',
  'low-score-confirm': '',
  drafting: 'Writing the draft message…',
  done: 'Draft ready.',
  error: '',
}

export default function RunWorkflow({ leadId }: { leadId: string }) {
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)
  const [scoreResult, setScoreResult] = useState<{ score: number; tier: string; summary_reason: string } | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [copied, setCopied] = useState(false)

  async function runResearch(force: boolean) {
    setError(null)
    setStep('researching')
    const result = await researchLead(leadId, force)
    if (result?.error) {
      setError(result.error)
      setStep('error')
      return
    }
    if (result?.needsConfirmation) {
      setStep('needs-confirm')
      return
    }
    // success (fresh research ran, or force=true re-ran it) — continue to scoring
    runScoring()
  }

  async function runScoring() {
    setError(null)
    setStep('scoring')
    const result = await scoreLead(leadId)
    if (result?.error) {
      setError(result.error)
      setStep('error')
      return
    }
    if (result?.success) {
      setScoreResult({ score: result.score, tier: result.tier, summary_reason: result.summary_reason })
      if (result.tier === 'COLD') {
        setStep('low-score-confirm')
        return
      }
      runDraft()
    }
  }

  async function runDraft() {
    setError(null)
    setStep('drafting')
    const result = await generateDraft(leadId)
    if (result?.error) {
      setError(result.error)
      setStep('error')
      return
    }
    if (result?.success) {
      setSubject(result.subject)
      setBody(result.body)
      setStep('done')
    }
  }

  function handleSave() {
    saveDraft(leadId, subject, body)
  }

  function handleCopy() {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function reset() {
    setStep('idle')
    setError(null)
    setScoreResult(null)
    setSubject('')
    setBody('')
  }

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-lg text-[#1F2430]">Run Full Workflow</h3>
        {step === 'idle' && (
          <button
            onClick={() => runResearch(false)}
            className="rounded bg-[#1B2A44] px-4 py-2 text-sm text-white hover:bg-[#243a5e]"
          >
            Research → Score → Draft
          </button>
        )}
        {(step === 'done' || step === 'error') && (
          <button onClick={reset} className="rounded border border-black/10 px-3 py-1.5 text-xs hover:bg-black/5">
            Run Again
          </button>
        )}
      </div>

      {(step === 'researching' || step === 'scoring' || step === 'drafting') && (
        <div className="rounded border border-black/10 bg-white p-3 text-sm text-[#6B7280]">
          <span className="inline-block animate-pulse">●</span> {STEP_LABEL[step]}
        </div>
      )}

      {step === 'needs-confirm' && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="text-amber-800">Research was already run on this lead within the last 7 days.</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => runResearch(true)}
              className="rounded bg-[#A87C4F] px-3 py-1.5 text-xs text-white hover:bg-[#946a42]"
            >
              Run Research Again
            </button>
            <button
              onClick={() => runScoring()}
              className="rounded border border-black/10 px-3 py-1.5 text-xs hover:bg-black/5"
            >
              Use Existing Research → Continue
            </button>
          </div>
        </div>
      )}

      {step === 'low-score-confirm' && scoreResult && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">
          <p className="text-red-800">
            Scored <strong>COLD ({scoreResult.score}/100)</strong> — {scoreResult.summary_reason}
          </p>
          <p className="mt-1 text-xs text-red-700">This lead doesn't look like a strong fit. Draft anyway?</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => runDraft()}
              className="rounded bg-[#A87C4F] px-3 py-1.5 text-xs text-white hover:bg-[#946a42]"
            >
              Draft Anyway
            </button>
            <button onClick={reset} className="rounded border border-black/10 px-3 py-1.5 text-xs hover:bg-black/5">
              Stop Here (score is saved)
            </button>
          </div>
        </div>
      )}

      {step === 'error' && error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {step === 'done' && (
        <div className="rounded border border-black/10 bg-white p-4 space-y-3">
          {scoreResult && (
            <p className="text-xs text-[#6B7280]">
              Scored <strong>{scoreResult.tier} ({scoreResult.score}/100)</strong> — {scoreResult.summary_reason}
            </p>
          )}
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
              rows={14}
              className="mt-1 w-full rounded border border-black/10 px-3 py-2 text-sm font-sans"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="rounded bg-[#A87C4F] px-4 py-2 text-sm text-white hover:bg-[#946a42]">
              Save Draft
            </button>
            <button onClick={handleCopy} className="rounded border border-black/10 px-4 py-2 text-sm hover:bg-black/5">
              {copied ? '✓ Copied' : 'Copy Message'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}