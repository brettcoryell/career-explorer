'use client'

import { useState } from 'react'

interface StarFormProps {
  profileId: string
  onComplete: () => void
  onLoadingChange?: (loading: boolean) => void
}

export default function StarForm({ profileId, onComplete, onLoadingChange }: StarFormProps) {
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim()) return
    setLoading(true)
    onLoadingChange?.(true)
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
      onLoadingChange?.(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-100 mb-1">Your Story</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Tell us about a specific accomplishment you&apos;re proud of — a moment when you solved a hard problem,
          led something through uncertainty, or delivered real impact. Include the situation, what you did, and the outcome.
        </p>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          Hint: the more specific you are — team size, numbers, what was at stake — the better we can match you.
        </p>
      </div>
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        rows={5}
        placeholder="Walk us through it — what was the situation, what did you do, and what happened as a result?"
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/60 resize-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || !answer.trim()}
        className="w-full py-2 rounded-lg text-sm font-medium bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Extracting your story signals…' : 'Refine my matches →'}
      </button>
    </form>
  )
}
