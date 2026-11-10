import { MAP_ART } from '../../art/mapAssets'
import { STAMPS, TIER_MARKS } from '../../art/marks'
import type { Exhibit } from '../../data/tours'

export interface ExhibitArt {
  src: string
  w: number
  h: number
  label: string
}

/** Icons Pearl can hold up while she explains them. Each uses the same art the app shows. */
export const EXHIBIT_ART: Record<Exhibit, ExhibitArt> = {
  'pin-site': { ...MAP_ART.siteMarker, label: 'Site pin' },
  'pin-target': { ...MAP_ART.targetFlag, label: 'Target flag' },
  'stamp-unexplored': STAMPS.unexplored,
  'stamp-explored': STAMPS.explored,
  'stamp-lifer': STAMPS.lifer,
  'tier-rare': TIER_MARKS.rare,
  'tier-scarce': TIER_MARKS.scarce,
  'tier-common': TIER_MARKS.common,
}

/** Largest whole-number scale that keeps the icon within `box` CSS pixels. */
export function exhibitScale(a: { w: number; h: number }, box = 64): number {
  return Math.max(1, Math.floor(box / Math.max(a.w, a.h)))
}
