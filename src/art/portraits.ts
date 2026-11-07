import type { DexSpecies } from '../data/schema'
import { placeholderDataUrl } from './birds/placeholder'

/**
 * Portrait loader: a real portrait if one exists, otherwise the generated placeholder.
 * These three are Bold Pixel drafts (style approved 7 Nov 2026; individual art not yet signed off).
 * Move an id out of this list only when the manifest says approved/removed.
 */
const DRAFT_PORTRAITS = new Set(['european-robin', 'common-kingfisher', 'grey-heron'])

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
