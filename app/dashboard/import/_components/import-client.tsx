'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { importCompanies, importContacts } from '../actions'

type ImportType = 'companies' | 'contacts'

export default function ImportClient() {
  const [type, setType] = useState<ImportType>('companies')
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ inserted: number; skipped?: { row: number; reason: string }[] } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetSelection() {
    setRows([])
    setFileName('')
    setResult(null)
    setError(null)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError(null)
    setResult(null)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => setRows(results.data),
      error: (err) => setError(`Could not read file: ${err.message}`),
    })
  }

  async function handleImport() {
    if (rows.length === 0) {
      setError('No rows to import — choose a CSV file first.')
      return
    }
    setError(null)
    setResult(null)
    setIsSubmitting(true)

    const outcome = type === 'companies' ? await importCompanies(rows as any) : await importContacts(rows as any)

    setIsSubmitting(false)

    if (outcome?.error) {
      setError(outcome.error)
      return
    }
    if (outcome?.success) {
      setResult({ inserted: outcome.inserted, skipped: (outcome as any).skipped })
    }
  }

  const expectedColumns =
    type === 'companies'
      ? ['name (required)', 'company_type', 'website', 'industry', 'headquarters', 'size', 'lending_category', 'source', 'notes']
      : [
          'name (required)',
          'company_name (required — must match an existing company)',
          'designation',
          'department',
          'linkedin_url',
          'email',
          'phone',
          'location',
          'decision_maker_category',
          'data_source',
          'verification_status',
          'do_not_contact (true/false)',
        ]

  return (
    <div>
      <h2 className="mb-4 font-serif text-xl text-[#1F2430]">Import from CSV</h2>

      <div className="mb-4 flex gap-3">
        <button
          onClick={() => { setType('companies'); resetSelection() }}
          className={`rounded px-4 py-2 text-sm ${type === 'companies' ? 'bg-[#1B2A44] text-white' : 'border border-black/10 hover:bg-black/5'}`}
        >
          Companies
        </button>
        <button
          onClick={() => { setType('contacts'); resetSelection() }}
          className={`rounded px-4 py-2 text-sm ${type === 'contacts' ? 'bg-[#1B2A44] text-white' : 'border border-black/10 hover:bg-black/5'}`}
        >
          Contacts
        </button>
      </div>

      <div className="rounded border border-black/10 bg-white p-4 mb-4">
        <p className="mb-2 text-sm text-[#6B7280]">Expected CSV columns for {type}: {expectedColumns.join(', ')}</p>
        <input type="file" accept=".csv" onChange={handleFile} className="text-sm" />
        {fileName && (
          <p className="mt-2 text-sm text-[#1F2430]">
            Selected: {fileName} ({rows.length} row{rows.length === 1 ? '' : 's'} found)
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded border border-black/10 bg-white p-4">
          <p className="mb-2 text-sm text-[#6B7280]">Preview (first 5 rows):</p>
          <table className="w-full text-xs">
            <thead>
              <tr>
                {Object.keys(rows[0]).map((col) => (
                  <th key={col} className="px-2 py-1 text-left text-[#6B7280]">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-t border-black/5">
                  {Object.keys(rows[0]).map((col) => (
                    <td key={col} className="px-2 py-1">{row[col]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Imported {result.inserted} row{result.inserted === 1 ? '' : 's'}.
          {result.skipped && result.skipped.length > 0 && (
            <div className="mt-2 text-amber-700">
              Skipped {result.skipped.length} row{result.skipped.length === 1 ? '' : 's'}:
              <ul className="mt-1 list-disc pl-5">
                {result.skipped.map((s, i) => (
                  <li key={i}>Row {s.row}: {s.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={rows.length === 0 || isSubmitting}
        className="rounded bg-[#A87C4F] px-4 py-2 text-sm text-white hover:bg-[#946a42] disabled:opacity-50"
      >
        {isSubmitting ? 'Importing…' : `Import ${rows.length} Row${rows.length === 1 ? '' : 's'}`}
      </button>
    </div>
  )
}