import type { DexSpecies } from '../data/schema'
import { placeholderDataUrl } from './birds/placeholder'
import draftIds from './draft-portraits.json'

/**
 * Portrait loader: a real portrait if one exists, otherwise the generated placeholder.
 * The ids are listed in draft-portraits.json (kept up to date by scripts/art/import_batch.py). All are Bold Pixel
 * drafts (style approved 7 Nov 2026; individual art not yet signed off).
 * Masters: research/art-drafts/bold-pixel/ (first three), .../expansion-v1/ (next nine), then one folder per batch.
 * Remove an id only when the manifest says approved/removed.
 */
export const DRAFT_PORTRAITS: ReadonlySet<string> = new Set<string>(draftIds)

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
