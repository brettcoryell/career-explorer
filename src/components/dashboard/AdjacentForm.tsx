'use client'

import { useState } from 'react'
import { JobPosting } from '@/lib/types'

interface AdjacentFormProps {
  profileId: string
  jobs: JobPosting[]
  onComplete: () => void
}

export default function AdjacentForm({ profileId, jobs, onComplete }: AdjacentFormProps) {
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get top Great-tiered titles to surface in the question
  const greatTitles = jobs
    .filter(j => j.fit_tier === 'great' && j.source_type === 'main')
    .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
    .slice(0, 3)
    .map(j => j.title)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/submit-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 6, answer, profileId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-100 mb-1">Broader Exploration</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          {greatTitles.length > 0 ? (
            <>
              You&apos;re a strong match for roles like{' '}
              <span className="text-amber-400">{greatTitles.join(', ')}</span>.
              What sounds interesting — or not interesting — about any of those, even if you&apos;re not sure you&apos;re ready?
            </>
          ) : (
            <>
              Based on everything you&apos;ve shared, what kinds of roles sound interesting — even ones you&apos;re not sure you&apos;re ready for?
            </>
          )}
        </p>
      </div>
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        rows={4}
        placeholder="What intrigues me, what doesn't…"
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/60 resize-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || !answer.trim()}
        className="w-full py-2 rounded-lg text-sm font-medium bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Exploring adjacent roles…' : 'Unlock Broader Vision →'}
      </button>
    </form>
  )
}
