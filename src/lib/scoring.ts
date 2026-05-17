import { PreferenceProfile, JobSignals, SignalConfidence } from './types'

const RAW_MIN = -0.85
const RAW_MAX = 1.60

function conf(confidence: Partial<SignalConfidence> | undefined, key: keyof SignalConfidence): number {
  return confidence?.[key] ?? 0.5
}

export function scoreJob(
  signals: Partial<JobSignals>,
  profile: Partial<PreferenceProfile>
): { raw: number; normalized: number; reasons: string[]; penalties: string[] } {
  let raw = 0.5
  const reasons: string[] = []
  const penalties: string[] = []
  const confidence = profile.signal_confidence

  const cConstraints = conf(confidence, 'constraints')
  const cAspiration = conf(confidence, 'aspiration')
  const cValues = conf(confidence, 'values')
  const cCapabilities = conf(confidence, 'capabilities')

  // Stage 2 — Constraint penalties
  if (profile.excluded_industries?.some(i =>
    signals.industries?.map(x => x.toLowerCase()).includes(i.toLowerCase())
  )) {
    raw -= 0.3 * cConstraints
    penalties.push('Excluded industry')
  }
  if (signals.company_type && profile.excluded_company_types?.map(x => x.toLowerCase()).includes(signals.company_type.toLowerCase())) {
    raw -= 0.3 * cConstraints
    penalties.push('Excluded company type')
  }
  if (profile.remote_required && signals.remote === 'no') {
    raw -= 0.3 * cConstraints
    penalties.push('Not remote')
  }
  if (profile.excluded_locations?.some(l =>
    signals.locations?.map(x => x.toLowerCase()).includes(l.toLowerCase())
  )) {
    raw -= 0.2 * cConstraints
    penalties.push('Excluded location')
  }
  if (profile.excluded_keywords?.some(k =>
    signals.key_requirements?.join(' ').toLowerCase().includes(k.toLowerCase())
  )) {
    raw -= 0.15 * cConstraints
    penalties.push('Excluded keyword match')
  }

  // Stage 3 — Aspiration bonuses
  if (profile.desired_functions?.some(f =>
    signals.primary_function?.toLowerCase().includes(f.toLowerCase())
  )) {
    raw += 0.2 * cAspiration
    reasons.push('Role function match')
  }
  if (profile.growth_direction === 'leadership' && ['manager', 'leader'].includes(signals.role_type ?? '')) {
    raw += 0.15 * cAspiration
    reasons.push('Leadership direction match')
  }
  if (profile.growth_direction === 'ic' && signals.role_type === 'ic') {
    raw += 0.15 * cAspiration
    reasons.push('IC direction match')
  }
  if (profile.keywords?.some(k =>
    signals.key_requirements?.join(' ').toLowerCase().includes(k.toLowerCase())
  )) {
    raw += 0.1 * cAspiration
    reasons.push('Keyword match')
  }
  if (profile.desired_industries?.some(i =>
    signals.industries?.map(x => x.toLowerCase()).includes(i.toLowerCase())
  )) {
    raw += 0.1 * cAspiration
    reasons.push('Desired industry match')
  }

  // Stage 4 — Values / culture bonuses
  if (profile.values_signals?.length && signals.culture_signals?.length) {
    const overlap = profile.values_signals.filter(v =>
      signals.culture_signals!.some(c => c.toLowerCase().includes(v.toLowerCase()))
    )
    if (overlap.length > 0) {
      raw += Math.min(0.2, overlap.length * 0.07) * cValues
      reasons.push(`Culture overlap: ${overlap.slice(0, 2).join(', ')}`)
    }
  }
  if (profile.work_style === 'autonomous' && signals.culture_signals?.some(c =>
    c.toLowerCase().includes('autonomous') || c.toLowerCase().includes('self-directed')
  )) {
    raw += 0.1 * cValues
    reasons.push('Work style match')
  }
  if (profile.work_style === 'collaborative' && signals.culture_signals?.some(c =>
    c.toLowerCase().includes('collaborative') || c.toLowerCase().includes('team')
  )) {
    raw += 0.1 * cValues
    reasons.push('Work style match')
  }

  // Stage 5 — Capabilities bonuses
  if (profile.demonstrated_capabilities?.length && signals.key_requirements?.length) {
    const overlap = profile.demonstrated_capabilities.filter(cap =>
      signals.key_requirements!.some(req => req.toLowerCase().includes(cap.toLowerCase()))
    )
    if (overlap.length > 0) {
      raw += Math.min(0.25, overlap.length * 0.08) * cCapabilities
      reasons.push(`Skills match: ${overlap.slice(0, 2).join(', ')}`)
    }
  }
  if (profile.problem_domain && signals.primary_function?.toLowerCase().includes(profile.problem_domain.toLowerCase())) {
    raw += 0.1 * cCapabilities
    reasons.push('Problem domain match')
  }

  const normalized = (raw - RAW_MIN) / (RAW_MAX - RAW_MIN)

  return {
    raw,
    normalized: Math.max(0, Math.min(1, normalized)),
    reasons,
    penalties,
  }
}

export function assignTier(normalizedScore: number): 'great' | 'good' | 'other' {
  if (normalizedScore >= 0.72) return 'great'
  if (normalizedScore >= 0.50) return 'good'
  return 'other'
}

export function makeDeduKey(title: string, company: string, location: string): string {
  const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()
  return `${normalize(title)}-${normalize(company)}-${normalize(location)}`
}
