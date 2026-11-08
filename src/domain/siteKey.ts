// Which "place" a sighting belongs to, for Bond, outings and exploration. Pure.
import type { Encounter } from '../data/personal-schema'
import { validSiteId } from '../data/personal-schema'

export const UNKNOWN_SITE = 'unknown'

/**
 * The eBird hotspot id when there is one, else the place label lowercased and trimmed, else "unknown".
 * "unknown" means we do not know where it was, so callers must never treat it as a real place.
 */
export function siteKey(e: Pick<Encounter, 'siteId' | 'place'>): string {
  const id = validSiteId(e.siteId)
  if (id) return id
  const label = (e.place ?? '').trim().toLowerCase()
  return label || UNKNOWN_SITE
}
