// Draft the Reserve Wardens for a region from the published data (AUTOPILOT D2). Pure and deterministic:
// the same data always gives the same draft. A human reads the draft, then commits src/data/wardens.v1.json.
import { dexById } from '../src/data/catalogue/index.ts'
import type { RegionData, Site } from '../src/data/published-schema.ts'
import { PERSONAS, type WardenHabitat } from '../src/data/personas.ts'
import type { SetId } from '../src/data/schema.ts'
import { distanceKm } from '../src/domain/geo.ts'
import { driveMinutes } from '../src/domain/ranking.ts'
import { siteCharacter } from '../src/domain/siteCharacter.ts'

export const WARDEN_MIN_SPECIES = 12
export const WARDEN_MAX_DRIVE_MIN = 90
export const WARDEN_COUNT = 8
export const WARDEN_SPACING_KM = 2
export const SIGNATURE_SIZE = 8

/** Names that say you can't just turn up (eBird often puts this in the hotspot name). Such sites never get a warden. */
export const RESTRICTED_NAME = /\b(permit|permits|private|members? only|no public access|no access|closed)\b|please use (a |the )?(more )?(precise|specific)/i

const OWL_GENERA = new Set(['Tyto', 'Strix', 'Athene', 'Asio'])
const HABITAT_ORDER: SetId[] = ['wetland', 'coast', 'woodland', 'farmland-upland', 'garden']
/** If a habitat has run out of personas, the closest habitat to borrow from. */
const BORROW: Record<WardenHabitat, WardenHabitat[]> = {
  wetland: ['coast'],
  coast: ['wetland'],
  woodland: ['garden'],
  garden: ['woodland'],
  'farmland-upland': ['raptors'],
  raptors: ['farmland-upland'],
  night: ['woodland'],
}

export interface DraftWarden {
  /** `<persona>-<regionId>`, e.g. maud-location-1, so the same persona in two locations never clashes. */
  id: string
  persona: string
  siteId: string
  siteName: string
  habitat: WardenHabitat
  signature: string[]
  boss: string
  /** For the person reading the draft only; not part of wardens.v1.json. */
  notes: { dexSpecies: number; driveMin: number; character: SetId[]; bossSites: number }
}

const dexSpeciesAt = (site: Site): string[] => [...new Set(site.reports.map((r) => r.speciesId).filter((id): id is string => !!id && !!dexById(id)))].sort()

function nearestDrive(region: RegionData, siteId: string): number | null {
  let best: number | null = null
  for (const start of Object.values(region.drive.byStart)) {
    const m = driveMinutes(start[siteId])
    if (m !== null && (best === null || m < best)) best = m
  }
  return best
}

export interface DraftOptions {
  /** How many wardens (at most the 12 personas). Default 8. */
  count?: number
  /** Furthest drive from the nearest start point. Default 90. */
  maxDriveMin?: number
  /** Least distance between two wardens' sites. Default 2. */
  spacingKm?: number
  /** How many wardens should be close to home (within `localDriveMin`); the rest are bigger destinations further out. Default 0 (no split). */
  localCount?: number
  /** What counts as close to home, in minutes from the nearest start point. Default 25. */
  localDriveMin?: number
}

export function draftWardens(region: RegionData, opts: DraftOptions = {}): DraftWarden[] {
  const count = Math.min(opts.count ?? WARDEN_COUNT, PERSONAS.length)
  const maxDriveMin = opts.maxDriveMin ?? WARDEN_MAX_DRIVE_MIN
  const spacingKm = opts.spacingKm ?? WARDEN_SPACING_KM
  // How many sites in the region report each Dex species (fewer = rarer).
  const sitesReporting = new Map<string, number>()
  for (const s of region.sites) for (const id of dexSpeciesAt(s)) sitesReporting.set(id, (sitesReporting.get(id) ?? 0) + 1)
  const rarer = (a: string, b: string) => (sitesReporting.get(a) ?? 0) - (sitesReporting.get(b) ?? 0) || a.localeCompare(b)

  const candidates = region.sites
    .map((site) => ({ site, species: dexSpeciesAt(site), driveMin: nearestDrive(region, site.id), character: siteCharacter(site) }))
    .filter((c) => !RESTRICTED_NAME.test(c.site.name) && c.species.length >= WARDEN_MIN_SPECIES && c.driveMin !== null && c.driveMin <= maxDriveMin)
  type Cand = (typeof candidates)[number]
  const bySpecies = (a: Cand, b: Cand) => b.species.length - a.species.length || a.site.id.localeCompare(b.site.id)

  /** The habitat a site was chosen to represent (it can differ from its first character when it was picked to fill a habitat). */
  const role = new Map<Cand, SetId>()
  const chosen: Cand[] = []
  const free = (c: Cand) => !chosen.includes(c) && chosen.every((x) => distanceKm(x.site.point, c.site.point) >= spacingKm)
  const localCount = Math.min(opts.localCount ?? 0, count)
  const localDriveMin = opts.localDriveMin ?? 25
  const tiers = localCount > 0
    ? [
        { pool: candidates.filter((c) => c.driveMin! <= localDriveMin), take: localCount },
        { pool: candidates.filter((c) => c.driveMin! > localDriveMin), take: count - localCount },
      ]
    : [{ pool: candidates, take: count }]
  for (const { pool, take } of tiers) {
    const start = chosen.length
    const room = () => chosen.length - start < take
    // One of each habitat first (a site counts for a habitat if it is one of its two main characters), then the busiest.
    for (const habitat of HABITAT_ORDER) {
      if (!room()) break
      const best = pool.filter((c) => c.character.includes(habitat) && free(c)).sort(bySpecies)[0]
      if (best) {
        chosen.push(best)
        role.set(best, habitat)
      }
    }
    for (const c of [...pool].sort(bySpecies)) {
      if (!room()) break
      if (free(c)) chosen.push(c)
    }
  }

  const used = new Set<string>()
  const out: DraftWarden[] = []
  for (const c of chosen) {
    const primary = role.get(c) ?? c.character[0]
    const inCharacter = c.species.filter((id) => dexById(id)!.sets.includes(primary)).sort(rarer)
    const others = c.species.filter((id) => !inCharacter.includes(id)).sort(rarer)
    const signature = [...inCharacter, ...others].slice(0, SIGNATURE_SIZE)
    const boss = [...signature].sort(rarer)[0]
    const bossDex = dexById(boss)!
    const habitat: WardenHabitat = OWL_GENERA.has(bossDex.sciName.split(' ')[0]) ? 'night' : bossDex.sets.includes('raptors') ? 'raptors' : primary

    const order = [habitat, ...BORROW[habitat]]
    const persona =
      order.flatMap((h) => PERSONAS.filter((p) => p.habitat === h)).find((p) => !used.has(p.id)) ?? PERSONAS.find((p) => !used.has(p.id))
    if (!persona) break
    used.add(persona.id)
    out.push({
      id: `${persona.id}-${region.regionId}`,
      persona: persona.id,
      siteId: c.site.id,
      siteName: c.site.name,
      habitat,
      signature,
      boss,
      notes: { dexSpecies: c.species.length, driveMin: c.driveMin!, character: c.character, bossSites: sitesReporting.get(boss) ?? 0 },
    })
  }
  return out
}
