// Warden jobs and trust (AUTOPILOT P9). Pure.
// Each month a warden asks for two small things at her own site. They come from the seeded random, so the same warden and
// month always give the same two jobs. Species are drawn from the warden's signature list only (never from today's reports),
// so a job never changes under you mid-month and a past month can be rebuilt exactly. The signature list was drafted from
// live reports, so every job is doable. Only real (non-sample) sightings at the warden's own site count.
import type { Encounter } from '../data/personal-schema'
import { dexById } from '../data/catalogue'
import { jobTemplatesFor, type JobKind, type JobTemplate, type Warden } from '../data/game'
import { rngFor } from './random'
import { seasonOfMonth, timeBand, type TimeBand } from './time'

export interface Job {
  /** The template id, e.g. `wet-count`. */
  id: string
  kind: JobKind
  /** YYYY-MM */
  month: string
  /** Plain English, slots filled. */
  text: string
  /** count and heard: the bird. */
  speciesId?: string
  /** count: the least number in one sighting. */
  min?: number
  /** band and signature: how many different birds. */
  n?: number
  band?: TimeBand
}

export interface JobStatus {
  done: boolean
  /** How far along (for a bar). */
  progress: number
  /** What done looks like. */
  target: number
}

export const JOBS_PER_MONTH = 2

export const TRUST_LEVELS = [
  { name: 'Newcomer', needs: 0 },
  { name: 'Visitor', needs: 1 },
  { name: 'Regular', needs: 3 },
  { name: 'Local', needs: 6 },
  { name: 'Friend of the reserve', needs: 10 },
] as const
export type TrustName = (typeof TRUST_LEVELS)[number]['name']

export const isMonth = (m: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(m)

function fill(t: JobTemplate, speciesId: string | undefined): string {
  const name = speciesId ? (dexById(speciesId)?.name ?? speciesId) : ''
  return t.text.replace('{bird}', name).replace('{min}', String(t.min ?? '')).replace('{n}', String(t.n ?? ''))
}

/** Two jobs for a warden in a month. Same inputs, same jobs; the two always differ in kind. */
export function jobsFor(warden: Warden, month: string): Job[] {
  if (!isMonth(month)) return []
  const templates = [...jobTemplatesFor(warden.habitat)]
  const rng = rngFor(`${warden.id}${month}`)
  // Fisher-Yates with the seeded generator.
  for (let i = templates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[templates[i], templates[j]] = [templates[j], templates[i]]
  }
  const chosen: JobTemplate[] = []
  for (const t of templates) {
    if (chosen.length >= JOBS_PER_MONTH) break
    if (chosen.some((c) => c.kind === t.kind)) continue
    chosen.push(t)
  }
  const pool = [...warden.signature]
  return chosen.map((t): Job => {
    let speciesId: string | undefined
    if (t.kind === 'count' || t.kind === 'heard') {
      const i = Math.floor(rng() * pool.length)
      speciesId = pool.splice(i, 1)[0] // a second bird job gets a different bird
    }
    const n = t.kind === 'signature' ? Math.min(t.n ?? 1, warden.signature.length) : t.n
    const job: Job = { id: t.id, kind: t.kind, month, text: fill({ ...t, n }, speciesId) }
    if (speciesId) job.speciesId = speciesId
    if (t.min !== undefined) job.min = t.min
    if (n !== undefined) job.n = n
    if (t.band) job.band = t.band
    return job
  })
}

const isReal = (e: Encounter) => e.source !== 'sample'

/** Real, dated sightings at the warden's site. */
function atSite(warden: Warden, encounters: readonly Encounter[]): Encounter[] {
  return encounters.filter((e) => isReal(e) && e.date !== null && e.siteId === warden.siteId)
}

/** Progress on one job from real sightings at the warden's site dated in the job's month. */
export function jobStatus(warden: Warden, job: Job, encounters: readonly Encounter[]): JobStatus {
  const here = atSite(warden, encounters)
  const inMonth = here.filter((e) => e.date!.slice(0, 7) === job.month)
  const finish = (progress: number, target: number): JobStatus => ({ done: progress >= target, progress: Math.min(progress, target), target })
  switch (job.kind) {
    case 'count': {
      // The biggest single count; "X" (null) and unknown counts never reach a target.
      const best = Math.max(0, ...inMonth.filter((e) => e.speciesId === job.speciesId).map((e) => e.count ?? 0))
      return finish(best, job.min ?? 1)
    }
    case 'heard': {
      const hit = inMonth.some((e) => e.speciesId === job.speciesId && (e.mode === 'heard' || e.mode === 'both') && (!job.band || timeBand(e.time) === job.band))
      return finish(hit ? 1 : 0, 1)
    }
    case 'band': {
      const birds = new Set(inMonth.filter((e) => timeBand(e.time) === job.band).map((e) => e.speciesId))
      return finish(birds.size, job.n ?? 1)
    }
    case 'signature': {
      const sig = new Set(warden.signature)
      const birds = new Set(inMonth.filter((e) => sig.has(e.speciesId)).map((e) => e.speciesId))
      return finish(birds.size, job.n ?? 1)
    }
    case 'season': {
      if (inMonth.length === 0) return finish(0, 1)
      const season = seasonOfMonth(Number(job.month.slice(5)))
      // New season = no earlier outing here fell in the same season (any year).
      const before = here.some((e) => e.date!.slice(0, 7) < job.month && seasonOfMonth(Number(e.date!.slice(5, 7))) === season)
      return finish(before ? 0 : 1, 1)
    }
  }
}

export interface Trust {
  /** Jobs completed since your first real outing at the site. */
  completed: number
  level: TrustName
  levelIndex: number
  /** The next level and how many more jobs it needs, or null at the top. */
  next: { level: TrustName; more: number } | null
  /** Months counted, oldest first (empty before your first real outing there). */
  months: string[]
}

export function trustLevel(completed: number): Pick<Trust, 'level' | 'levelIndex' | 'next'> {
  let idx = 0
  TRUST_LEVELS.forEach((l, i) => {
    if (completed >= l.needs) idx = i
  })
  const nxt = TRUST_LEVELS[idx + 1]
  return { level: TRUST_LEVELS[idx].name, levelIndex: idx, next: nxt ? { level: nxt.name, more: nxt.needs - completed } : null }
}

const monthOfDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

/** Trust = jobs completed in every month from your first real outing at the site up to and including `now`'s month. */
export function trust(warden: Warden, encounters: readonly Encounter[], now: Date): Trust {
  const here = atSite(warden, encounters)
  const thisMonth = monthOfDate(now)
  const first = here.map((e) => e.date!.slice(0, 7)).filter((m) => m <= thisMonth).sort()[0]
  const months: string[] = []
  if (first) {
    let y = Number(first.slice(0, 4))
    let m = Number(first.slice(5))
    for (let guard = 0; guard < 1200; guard++) {
      const key = `${y}-${String(m).padStart(2, '0')}`
      if (key > thisMonth) break
      months.push(key)
      if (++m > 12) {
        m = 1
        y++
      }
    }
  }
  let completed = 0
  for (const month of months) for (const job of jobsFor(warden, month)) if (jobStatus(warden, job, encounters).done) completed++
  return { completed, ...trustLevel(completed), months }
}
