import type { DexSpecies } from '../data/schema'
import { placeholderDataUrl } from './birds/placeholder'

/**
 * Portrait loader: a real portrait if one exists, otherwise the generated placeholder.
 * These twelve are Bold Pixel drafts (style approved 7 Nov 2026; individual art not yet signed off).
 * Masters: research/art-drafts/bold-pixel/ (first three) and .../expansion-v1/ (other nine).
 * Move an id out of this list only when the manifest says approved/removed.
 */
export const DRAFT_PORTRAITS = new Set([
  'european-robin', 'common-kingfisher', 'grey-heron',
  'eurasian-blue-tit', 'great-tit', 'eurasian-blackbird', 'mallard', 'mute-swan', 'eurasian-wren',
  'great-spotted-woodpecker', 'common-kestrel', 'common-buzzard',
])

export interface PortraitSource {
  src: string
  /** CSS class to turn a real portrait into the flat unrecorded silhouette. */
  silhouetteFilter: boolean
  isPlaceholder: boolean
}

export function portraitSource(s: DexSpecies, silhouette: boolean): PortraitSource {
  if (DRAFT_PORTRAITS.has(s.id)) {
    return {
      src: `${import.meta.env.BASE_URL}assets/birds/${s.id}/adult-portrait-draft.png`,
      silhouetteFilter: silhouette,
      isPlaceholder: false,
    }
  }
  return { src: placeholderDataUrl(s, silhouette), silhouetteFilter: false, isPlaceholder: true }
}
