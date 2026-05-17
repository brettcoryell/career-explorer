'use client'

import { useState } from 'react'

interface ValuesFormProps {
  profileId: string
  onComplete: () => void
}

export default function ValuesForm({ profileId, onComplete }: ValuesFormProps) {
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/submit-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 4, answer, profileId }),
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
        <h3 className="text-sm font-semibold text-slate-100 mb-1">Values &amp; Culture Fit</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Tell me about a time you felt genuinely proud of something you accomplished at work — not the result, but the way it was done or what it meant.
        </p>
      </div>
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        rows={5}
        placeholder="The work that meant the most to me…"
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/60 resize-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || !answer.trim()}
        className="w-full py-2 rounded-lg text-sm font-medium bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Analyzing…' : 'Find Value-Aligned Jobs →'}
      </button>
    </form>
  )
}
