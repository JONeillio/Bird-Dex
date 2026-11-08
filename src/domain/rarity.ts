// How scarce a bird is in the area you are in, from the last fortnight of public reports.
// Species-level and per region: a bird's value depends on where you are, not on the site.
// Only used for points and labels; reports never award collection progress.
import type { RegionData } from '../data/published-schema'
import { dexById } from '../data/catalogue'

export type RarityTier = 'rare' | 'scarce' | 'uncommon' | 'fairly-common' | 'common' | 'unreported' | 'unknown'

export const RARITY_POINTS: Record<RarityTier, number> = {
  rare: 25,
  scarce: 10,
  uncommon: 5,
  'fairly-common': 2,
  common: 1,
  unreported: 8,
  unknown: 1,
}

export const RARITY_LABELS: Record<RarityTier, string> = {
  rare: 'Rare',
  scarce: 'Scarce',
  uncommon: 'Uncommon',
  'fairly-common': 'Fairly common',
  common: 'Common',
  unreported: 'Not reported nearby lately',
  unknown: 'Rarity unknown',
}

export interface RarityInfo {
  tier: RarityTier
  points: number
  /** Share of counted sites reporting it (0-1), or null for unreported / unknown. */
  share: number | null
}

export interface RarityTable {
  /** False when there is no region data, so every bird is "unknown" and scores are flat. */
  hasData: boolean
  /** Sites with at least one report. */
  countedSites: number
  byBinomial: ReadonlyMap<string, RarityInfo>
}

/** First two words of a scientific name, so subspecies forms match (`Branta bernicla bernicla` -> `Branta bernicla`). */
export function binomialOf(sciName: string): string {
  return sciName.trim().split(/\s+/).slice(0, 2).join(' ')
}

export function tierForShare(share: number): RarityTier {
  if (share < 0.03) return 'scarce'
  if (share < 0.1) return 'uncommon'
  if (share < 0.25) return 'fairly-common'
  return 'common'
}

function info(tier: RarityTier, share: number | null): RarityInfo {
  return { tier, points: RARITY_POINTS[tier], share }
}

/**
 * Tiers, from the share of sites that reported the bird in the window:
 * any confirmed notable report = rare (25); under 3% = scarce (10); under 10% = uncommon (5);
 * under 25% = fairly common (2); otherwise common (1). Recomputed from current data, so it moves with the seasons.
 */
export function buildRarity(region: RegionData | null): RarityTable {
  const counted = region ? region.sites.filter((s) => s.reports.length > 0) : []
  if (!region || counted.length === 0) return { hasData: false, countedSites: 0, byBinomial: new Map() }

  const siteCount = new Map<string, number>()
  const notable = new Set<string>()
  for (const site of counted) {
    const seen = new Set<string>()
    for (const r of site.reports) {
      const b = binomialOf(r.sciName)
      if (!seen.has(b)) {
        seen.add(b)
        siteCount.set(b, (siteCount.get(b) ?? 0) + 1)
      }
      if (r.notable && !r.unconfirmed) notable.add(b)
    }
  }
  const table = new Map<string, RarityInfo>()
  for (const [b, n] of siteCount) {
    const share = n / counted.length
    table.set(b, notable.has(b) ? info('rare', share) : info(tierForShare(share), share))
  }
  return { hasData: true, countedSites: counted.length, byBinomial: table }
}

/** Rarity of a bird by scientific name. Not in the table = not reported nearby lately. No data at all = unknown. */
export function rarityOf(table: RarityTable, sciName: string | null | undefined): RarityInfo {
  if (!table.hasData) return info('unknown', null)
  if (!sciName) return info('unreported', null)
  return table.byBinomial.get(binomialOf(sciName)) ?? info('unreported', null)
}

/** Scientific name for a species id: the Starter Dex entry, else the name kept on an outside-Dex sighting. */
export function sciNameFor(speciesId: string, encounterSciName?: string | null): string | null {
  return dexById(speciesId)?.sciName ?? encounterSciName ?? null
}
