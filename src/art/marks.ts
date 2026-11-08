// Stamps and rarity tier marks from game art Set A (8 Nov 2026, AI-assisted drafts).
// Details, meanings and intended screens: research/art-drafts/game-art/set-a-stamps-tiers/README.md.
// Stamps are 32x32 and tier marks 16x16 native pixels: show at whole-number scales only (spriteImg-style).
import type { RarityTier } from '../domain/rarity'

const base = import.meta.env.BASE_URL + 'assets/'

export interface Mark {
  src: string
  w: number
  h: number
  /** Plain-English name for alt text and labels. */
  label: string
}

const stamp = (file: string, label: string): Mark => ({ src: `${base}stamps/${file}.png`, w: 32, h: 32, label })
const tier = (file: string, label: string): Mark => ({ src: `${base}tiers/${file}.png`, w: 16, h: 16, label })

export const STAMPS = {
  lifer: stamp('stamp_lifer', 'Lifer'),
  firstOfYear: stamp('stamp_first_of_year', 'First of the year'),
  explored: stamp('stamp_explored', 'Explored'),
  newBest: stamp('stamp_new_best', 'New site best'),
  rankUp: stamp('stamp_rank_up', 'Rank up'),
  unexplored: stamp('stamp_unexplored', 'Not visited yet'),
} satisfies Record<string, Mark>

export const TIER_MARKS = {
  common: tier('tier_1_common', 'Common'),
  'fairly-common': tier('tier_2_fairly_common', 'Fairly common'),
  uncommon: tier('tier_3_uncommon', 'Uncommon'),
  scarce: tier('tier_4_scarce', 'Scarce'),
  rare: tier('tier_5_rare', 'Rare'),
  /** Plum gem. No engine tier maps to it yet. */
  special: tier('tier_6_special', 'Special'),
} satisfies Record<string, Mark>

/** The mark for an engine rarity tier, or null for `unreported` / `unknown` (draw nothing, or a hollow outline in code). */
export function tierMarkFor(t: RarityTier): Mark | null {
  return t === 'unreported' || t === 'unknown' ? null : TIER_MARKS[t]
}
