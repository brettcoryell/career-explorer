import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const ADMIN_EMAIL = 'brettcoryell@yahoo.com'

export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams: { stage?: string; source?: string; since?: string }
}) {
  const supabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/')
  }

  let query = supabase
    .from('error_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (searchParams.stage) query = query.eq('stage', parseInt(searchParams.stage))
  if (searchParams.source) query = query.eq('source', searchParams.source)
  if (searchParams.since) query = query.gte('created_at', searchParams.since)

  const { data: errors } = await query

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-100">Error Log</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono">{errors?.length ?? 0} entries</span>
            <a
              href="/dashboard"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors border border-slate-700 rounded-lg px-3 py-1.5"
            >
              ← Dashboard
            </a>
          </div>
        </div>

        {/* Filters */}
        <form className="flex gap-3 mb-6 flex-wrap">
          <input
            name="stage"
            defaultValue={searchParams.stage}
            placeholder="Stage #"
            type="number"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 w-24 focus:outline-none focus:border-amber-500/60"
          />
          <input
            name="source"
            defaultValue={searchParams.source}
            placeholder="Source"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 w-40 focus:outline-none focus:border-amber-500/60"
          />
          <input
            name="since"
            defaultValue={searchParams.since}
            placeholder="Since (ISO date)"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 w-48 focus:outline-none focus:border-amber-500/60"
          />
          <button
            type="submit"
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-medium hover:bg-amber-400 transition-colors"
          >
            Filter
          </button>
          <a
            href="/admin/errors"
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            Clear
          </a>
        </form>

        {(!errors || errors.length === 0) ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <p className="text-slate-400">No errors found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {errors.map((err) => (
              <details
                key={err.id}
                className="bg-slate-900 border border-slate-800 rounded-xl"
              >
                <summary className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-800/40 rounded-xl list-none">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {err.source && (
                        <span className="text-xs font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                          {err.source}
                        </span>
                      )}
                      {err.stage !== null && err.stage !== undefined && (
                        <span className="text-xs bg-amber-950/60 text-amber-400 border border-amber-800/60 px-1.5 py-0.5 rounded">
                          Stage {err.stage}
                        </span>
                      )}
                      {err.error_code && (
                        <span className="text-xs bg-red-950/60 text-red-400 border border-red-800/60 px-1.5 py-0.5 rounded">
                          {err.error_code}
                        </span>
                      )}
                      <span className="text-xs text-slate-600 font-mono ml-auto">
                        {new Date(err.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 font-medium truncate">{err.error_message}</p>
                    {err.profile_id && (
                      <p className="text-xs text-slate-600 mt-0.5 font-mono">{err.profile_id}</p>
                    )}
                  </div>
                </summary>
                <div className="px-4 pb-4 border-t border-slate-800 pt-3">
                  <p className="text-xs text-slate-400 font-semibold mb-1">Full message</p>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap mb-3">{err.error_message}</p>
                  {err.query_context && Object.keys(err.query_context).length > 0 && (
                    <>
                      <p className="text-xs text-slate-400 font-semibold mb-1">Query context</p>
                      <pre className="text-xs text-slate-400 bg-slate-800 rounded-lg p-3 overflow-x-auto">
                        {JSON.stringify(err.query_context, null, 2)}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
