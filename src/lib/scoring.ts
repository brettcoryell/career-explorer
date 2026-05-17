import { PreferenceProfile, JobSignals, SignalConfidence, FitSignal } from './types'

const RAW_MIN = -0.85
const RAW_MAX = 1.83

const SENIORITY_RANK: Record<string, number> = {
  'entry': 1, 'mid': 2, 'senior': 3, 'director': 4, 'vp': 5, 'c-level': 6,
}

function conf(confidence: Partial<SignalConfidence> | undefined, key: keyof SignalConfidence): number {
  return confidence?.[key] ?? 0.5
}

function tokenOverlap(a: string, b: string): boolean {
  const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3)
  const aT = tokens(a)
  const bT = new Set(tokens(b))
  return aT.some(t => bT.has(t))
}

function arrayOverlapCount(desired: string[], available: string[]): number {
  const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3)
  const availTokens = new Set(available.flatMap(tokens))
  return desired.flatMap(tokens).filter(t => availTokens.has(t)).length
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

export function scoreJob(
  signals: Partial<JobSignals>,
  profile: Partial<PreferenceProfile>
): { raw: number; normalized: number; reasons: FitSignal[]; penalties: FitSignal[] } {
  let raw = 0.5
  const reasons: FitSignal[] = []
  const penalties: FitSignal[] = []
  const confidence = profile.signal_confidence

  const cConstraints = conf(confidence, 'constraints')
  const cAspiration = conf(confidence, 'aspiration')
  const cValues = conf(confidence, 'values')
  const cCapabilities = conf(confidence, 'capabilities')
  const cStar = conf(confidence, 'star')

  // ── Seniority mismatch (Stage 1, no confidence damping) ──────────────────
  const profileSeniority = profile.seniority_level
  if (profileSeniority && signals.seniority && signals.seniority !== 'unclear') {
    const profileRank = SENIORITY_RANK[profileSeniority] ?? 0
    const jobRank = SENIORITY_RANK[signals.seniority] ?? 0
    const gap = profileRank - jobRank
    if (gap >= 2) {
      raw -= 0.45
      penalties.push({ label: 'Role well below experience level', detail: `Your profile indicates ${profileSeniority} level; this role appears to be ${signals.seniority} level.` })
    } else if (gap === 1) {
      raw -= 0.2
      penalties.push({ label: 'Role below experience level', detail: `Your profile indicates ${profileSeniority} level; this role appears to be ${signals.seniority} level.` })
    } else if (gap === 0) {
      raw += 0.15
      reasons.push({ label: 'Seniority match', detail: `Both your profile and this role are at the ${profileSeniority} level.` })
    }
  }

  // ── Stage 2 — Constraint penalties ──────────────────────────────────────
  const matchedExcludedIndustry = profile.excluded_industries?.find(i =>
    signals.industries?.some(ji => tokenOverlap(i, ji))
  )
  if (matchedExcludedIndustry) {
    raw -= 0.3 * cConstraints
    penalties.push({ label: 'Excluded industry', detail: `You excluded "${matchedExcludedIndustry}" — this role's industry overlaps with that.` })
  }

  if (signals.company_type && profile.excluded_company_types?.some(t => tokenOverlap(t, signals.company_type!))) {
    const matchedType = profile.excluded_company_types?.find(t => tokenOverlap(t, signals.company_type!))
    raw -= 0.3 * cConstraints
    penalties.push({ label: 'Excluded company type', detail: `You excluded "${matchedType}" — this company is classified as ${signals.company_type}.` })
  }

  if (profile.remote_required && signals.remote === 'no') {
    raw -= 0.3 * cConstraints
    penalties.push({ label: 'Requires on-site work', detail: 'You require remote work. This role specifies on-site or does not offer remote.' })
  }

  const matchedExcludedLoc = profile.excluded_locations?.find(l =>
    signals.locations?.some(jl => tokenOverlap(l, jl))
  )
  if (matchedExcludedLoc) {
    raw -= 0.2 * cConstraints
    penalties.push({ label: 'Excluded location', detail: `You excluded "${matchedExcludedLoc}" — this role is listed in a matching location.` })
  }

  const reqText = signals.key_requirements?.join(' ') ?? ''
  const matchedKeyword = profile.excluded_keywords?.find(k => reqText.toLowerCase().includes(k.toLowerCase()))
  if (matchedKeyword) {
    raw -= 0.15 * cConstraints
    penalties.push({ label: 'Excluded keyword match', detail: `You excluded "${matchedKeyword}" and it appears in this role's requirements.` })
  }

  // ── Stage 3 — Aspiration bonuses ────────────────────────────────────────
  if (profile.desired_functions?.length && signals.primary_function) {
    const matchedFn = profile.desired_functions.find(f => tokenOverlap(f, signals.primary_function!))
    if (matchedFn) {
      raw += 0.2 * cAspiration
      reasons.push({ label: 'Function match', detail: `You want to work in "${matchedFn}" — this role's primary function is ${signals.primary_function}.` })
    }
  }

  if (profile.growth_direction === 'leadership' && ['manager', 'leader'].includes(signals.role_type ?? '')) {
    raw += 0.15 * cAspiration
    reasons.push({ label: 'Leadership direction match', detail: 'You\'re targeting leadership roles, and this role is classified as manager or leader level.' })
  }
  if (profile.growth_direction === 'ic' && signals.role_type === 'ic') {
    raw += 0.15 * cAspiration
    reasons.push({ label: 'IC direction match', detail: 'You\'re targeting individual contributor roles, and this role matches that.' })
  }

  const keywordMatches = arrayOverlapCount(profile.keywords ?? [], signals.key_requirements ?? [])
  if (keywordMatches > 0) {
    raw += Math.min(0.15, keywordMatches * 0.05) * cAspiration
    reasons.push({ label: `Keyword match (${keywordMatches})`, detail: `${keywordMatches} of your stated search keywords appear in this role's requirements.` })
  }

  if (profile.desired_industries?.some(i => signals.industries?.some(ji => tokenOverlap(i, ji)))) {
    const matchedInd = profile.desired_industries.find(i => signals.industries?.some(ji => tokenOverlap(i, ji)))
    raw += 0.1 * cAspiration
    reasons.push({ label: 'Desired industry match', detail: `You want to work in "${matchedInd}" — this role's industry aligns.` })
  }

  if (profile.desired_company_types?.length && signals.company_type) {
    if (profile.desired_company_types.some(t => tokenOverlap(t, signals.company_type!))) {
      raw += 0.08 * cAspiration
      reasons.push({ label: 'Company type match', detail: `This is a ${signals.company_type} — you\'ve indicated preference for this company type.` })
    }
  }

  // ── Stage 4 — Values / culture bonuses ──────────────────────────────────
  if (profile.values_signals?.length && signals.culture_signals?.length) {
    const overlap = arrayOverlapCount(profile.values_signals, signals.culture_signals)
    if (overlap > 0) {
      raw += Math.min(0.2, overlap * 0.07) * cValues
      reasons.push({ label: `Culture overlap (${overlap})`, detail: `${overlap} of your stated values align with culture signals in this posting (${signals.culture_signals.slice(0, 3).join(', ')}).` })
    }
  }

  if (profile.work_style === 'autonomous' && signals.culture_signals?.some(c =>
    tokenOverlap(c, 'autonomous self-directed independent')
  )) {
    raw += 0.08 * cValues
    reasons.push({ label: 'Work style match', detail: 'You prefer autonomous work, and this role signals self-directed or independent culture.' })
  }
  if (profile.work_style === 'collaborative' && signals.culture_signals?.some(c =>
    tokenOverlap(c, 'collaborative team cross-functional')
  )) {
    raw += 0.08 * cValues
    reasons.push({ label: 'Work style match', detail: 'You prefer collaborative work, and this role signals team-oriented culture.' })
  }

  // ── Stage 5 — Capabilities bonuses ──────────────────────────────────────
  if (profile.demonstrated_capabilities?.length && signals.key_requirements?.length) {
    const overlap = arrayOverlapCount(profile.demonstrated_capabilities, signals.key_requirements)
    if (overlap > 0) {
      raw += Math.min(0.25, overlap * 0.08) * cCapabilities
      const matched = profile.demonstrated_capabilities.filter(cap =>
        signals.key_requirements!.some(req => tokenOverlap(cap, req))
      ).slice(0, 3)
      reasons.push({ label: `Skills match (${overlap})`, detail: `Matched: ${matched.join(', ')}.` })
    }
  }

  if (profile.problem_domain && signals.primary_function &&
    tokenOverlap(profile.problem_domain, signals.primary_function)) {
    raw += 0.1 * cCapabilities
    reasons.push({ label: 'Problem domain match', detail: `Your primary domain (${profile.problem_domain}) aligns with this role's function (${signals.primary_function}).` })
  }

  // ── Stage 6 — STAR story bonuses ────────────────────────────────────────
  if (profile.star_skills_demonstrated?.length && signals.key_requirements?.length) {
    const starOverlap = profile.star_skills_demonstrated.filter(skill =>
      signals.key_requirements!.some(req =>
        req.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(req.toLowerCase())
      )
    ).length

    if (starOverlap >= 2) {
      raw += 0.15 * cStar
      reasons.push({ label: 'Your featured accomplishment matches key requirements', detail: `Your STAR story demonstrated: ${profile.star_skills_demonstrated.slice(0, 3).join(', ')}. This role requires overlapping skills.` })
    } else if (starOverlap === 1) {
      raw += 0.08 * cStar
      reasons.push({ label: 'Your featured accomplishment shows relevant skills', detail: `Your STAR story skills (${profile.star_skills_demonstrated.join(', ')}) show partial overlap with this role's requirements.` })
    }
  }

  if (profile.star_industry_context && signals.industries?.length) {
    if (signals.industries.some(i =>
      i.toLowerCase().includes(profile.star_industry_context!.toLowerCase()) ||
      profile.star_industry_context!.toLowerCase().includes(i.toLowerCase())
    )) {
      raw += 0.08 * cStar
      reasons.push({ label: 'Your accomplishment context matches this industry', detail: `Your STAR story is set in ${profile.star_industry_context}, which aligns with this role's industry.` })
    }
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
