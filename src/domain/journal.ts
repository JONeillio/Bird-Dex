import type { Encounter } from '../data/personal-schema'

const DAY = 86_400_000

export function formatDate(iso: string | null): string {
  if (!iso) return 'Date not recorded'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Newest first; undated sightings go last, ordered by when they were added. */
export function sortEncounters(list: readonly Encounter[]): Encounter[] {
  return [...list].sort((a, b) => {
    if (a.date && b.date && a.date !== b.date) return a.date < b.date ? 1 : -1
    if (!!a.date !== !!b.date) return a.date ? -1 : 1
    return a.createdAt < b.createdAt ? 1 : -1
  })
}

export function backupDue(count: number, lastBackupAt: string | null, now = Date.now()): boolean {
  if (count === 0) return false
  if (!lastBackupAt) return true
  const t = Date.parse(lastBackupAt)
  return Number.isNaN(t) || now - t > 30 * DAY
}
