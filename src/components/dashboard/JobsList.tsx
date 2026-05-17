'use client'

import { useState } from 'react'
import { JobPosting } from '@/lib/types'
import JobCard from './JobCard'

interface JobsListProps {
  jobs: JobPosting[]
  ignoredJobs?: JobPosting[]
  stageCompleted: number
  onIgnore?: (id: string) => void
  onRestore?: (id: string) => void
}

const TIER_CONFIG = {
  great: {
    label: 'Great Matches',
    headerColor: 'text-amber-400',
    borderColor: 'border-amber-800/40',
    bgColor: 'bg-amber-950/20',
    dotColor: 'bg-amber-400',
  },
  good: {
    label: 'Good Matches',
    headerColor: 'text-sky-400',
    borderColor: 'border-sky-800/40',
    bgColor: 'bg-sky-950/20',
    dotColor: 'bg-sky-400',
  },
  other: {
    label: 'Other',
    headerColor: 'text-slate-400',
    borderColor: 'border-slate-700/40',
    bgColor: 'bg-slate-800/20',
    dotColor: 'bg-slate-500',
  },
} as const

export default function JobsList({ jobs, ignoredJobs = [], stageCompleted, onIgnore, onRestore }: JobsListProps) {
  const [showIgnored, setShowIgnored] = useState(false)

  if (jobs.length === 0 && ignoredJobs.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-slate-400 font-medium mb-1">No jobs yet</p>
        <p className="text-slate-600 text-sm">
          Complete the stages on the left to start discovering relevant jobs.
        </p>
      </div>
    )
  }

  const tiers: Array<'great' | 'good' | 'other'> = ['great', 'good', 'other']

  return (
    <div className="space-y-8">
      {tiers.map(tier => {
        const tierJobs = jobs.filter(j => j.fit_tier === tier)
        const unscoredJobs = tier === 'other' ? jobs.filter(j => j.fit_tier === null) : []
        const displayJobs = tier === 'other' ? [...tierJobs, ...unscoredJobs] : tierJobs

        if (displayJobs.length === 0) return null

        const config = TIER_CONFIG[tier]

        return (
          <div key={tier}>
            <div className={`flex items-center gap-3 mb-4 pb-3 border-b ${config.borderColor}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
              <h2 className={`font-semibold ${config.headerColor}`}>
                {config.label}
              </h2>
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${config.bgColor} ${config.headerColor}`}>
                {displayJobs.length}
              </span>
            </div>

            <div className="grid gap-3">
              {displayJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  stageCompleted={stageCompleted}
                  onIgnore={onIgnore}
                  onRestore={onRestore}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Ignored jobs toggle */}
      {ignoredJobs.length > 0 && (
        <div>
          <button
            onClick={() => setShowIgnored(s => !s)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 mb-3"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showIgnored ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {showIgnored ? 'Hide' : 'Show'} {ignoredJobs.length} ignored {ignoredJobs.length === 1 ? 'job' : 'jobs'}
          </button>
          {showIgnored && (
            <div className="grid gap-3">
              {ignoredJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  stageCompleted={stageCompleted}
                  onIgnore={onIgnore}
                  onRestore={onRestore}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
