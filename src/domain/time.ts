// Shared time definitions for Bond, duels and badges. Pure; no clock reads except where a Date is passed in.

export type TimeBand = 'dawn' | 'day' | 'dusk' | 'night'
export type Season = 'winter' | 'spring' | 'summer' | 'autumn'

/** Current time as HH:MM (24 hours) in the phone's own time zone. */
export function nowHHMM(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(now.getHours())}:${p(now.getMinutes())}`
}

/**
 * dawn 04:00-08:59, day 09:00-16:59, dusk 17:00-20:59, night 21:00-03:59.
 * No (or an invalid) time means no band; a band is never guessed.
 */
export function timeBand(time: string | null | undefined): TimeBand | null {
  const m = /^(\d{2}):(\d{2})$/.exec(time ?? '')
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  if (h >= 4 && h < 9) return 'dawn'
  if (h >= 9 && h < 17) return 'day'
  if (h >= 17 && h < 21) return 'dusk'
  return 'night'
}

/** winter Dec-Feb, spring Mar-May, summer Jun-Aug, autumn Sep-Nov. Month is 1-12. */
export function seasonOfMonth(month: number): Season {
  if (month === 12 || month <= 2) return 'winter'
  if (month <= 5) return 'spring'
  if (month <= 8) return 'summer'
  return 'autumn'
}

/** Month 1-12 from a YYYY-MM-DD date, or null when there is no valid date. */
export function monthOf(date: string | null | undefined): number | null {
  const m = /^\d{4}-(\d{2})-\d{2}$/.exec(date ?? '')
  if (!m) return null
  const n = Number(m[1])
  return n >= 1 && n <= 12 ? n : null
}
