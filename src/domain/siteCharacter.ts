// What kind of place a site is, worked out from the Starter Dex birds reported there. No new data needed.
import { dexById } from '../data/catalogue'
import type { Site } from '../data/published-schema'
import { SETS, type SetId } from '../data/schema'

/**
 * Count the site's distinct reported Dex species per set (a bird counts in each of its sets), sort by count,
 * keep sets holding at least 25% of the site's Dex species, at most two. No Dex birds, or nothing that
 * reaches 25%, falls back to ['garden']. Ties go in the order of SETS, so the answer is always the same.
 */
export function siteCharacter(site: Pick<Site, 'reports'>): SetId[] {
  const species = new Set<string>()
  for (const r of site.reports) if (r.speciesId && dexById(r.speciesId)) species.add(r.speciesId)
  if (species.size === 0) return ['garden']

  const counts = new Map<SetId, number>()
  for (const id of species) for (const s of dexById(id)!.sets) counts.set(s, (counts.get(s) ?? 0) + 1)

  const kept = SETS.filter((s) => (counts.get(s) ?? 0) / species.size >= 0.25)
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
    .slice(0, 2)
  return kept.length > 0 ? kept : ['garden']
}
