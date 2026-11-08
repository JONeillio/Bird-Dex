// Folk (AUTOPILOT P12): the twelve story NPCs. Each lives at one site per region and is met by a real outing there.
// Pure. Meetings come from real (non-sample) outings only, so the made-up sample history and public reports never meet anyone.
import { dexById } from '../data/catalogue'
import type { Challenge, Npc } from '../data/game'
import { isNpcDoc, isNpcHomesDoc, type GameDoc } from '../data/personal/game-schema'
import type { Encounter } from '../data/personal-schema'
import type { RegionData, Site } from '../data/published-schema'
import { distanceKm } from './geo'
import { groupOutings } from './outings'
import { rngFor } from './random'
import { siteCharacter } from './siteCharacter'
import { timeBand, type TimeBand } from './time'

/** An NPC's home may not be within this distance of another NPC's home. */
export const HOME_SPACING_KM = 2
export const NPC_MAP_MIN_ZOOM = 13
export const NPC_MAP_MAX = 3

// ---------- Home sites ----------

/**
 * Where each NPC lives in a region. NPCs that already have a home keep it while that site is still in the data; the rest get the
 * site with the most Starter Dex species whose character matches one of their habitats. Warden sites are skipped, and so is
 * anything within 2 km of another NPC's home. Ties are broken with a seeded draw (region + NPC), so the result never changes
 * on a re-run. An NPC with no matching site gets no home here.
 */
export function assignHomes(region: RegionData, npcs: readonly Npc[], wardens: readonly { siteId: string }[], existing: Readonly<Record<string, string>> = {}): Record<string, string> {
  const sites = new Map(region.sites.map((s) => [s.id, s]))
  const wardenSites = new Set(wardens.map((w) => w.siteId))
  const homes: Record<string, string> = {}
  for (const n of npcs) {
    const have = existing[n.id]
    if (have && sites.has(have)) homes[n.id] = have
  }
  const dexCount = (s: Site) => new Set(s.reports.map((r) => r.speciesId).filter((id): id is string => !!id && !!dexById(id))).size
  const eligible = region.sites
    .filter((s) => !wardenSites.has(s.id))
    .map((s) => ({ site: s, count: dexCount(s), character: new Set(siteCharacter(s)) }))
    .filter((c) => c.count > 0)
  for (const n of npcs) {
    if (homes[n.id]) continue
    const taken = Object.values(homes).map((id) => sites.get(id)!.point)
    const fits = eligible.filter((c) => n.habitats.some((h) => c.character.has(h)) && taken.every((p) => distanceKm(p, c.site.point) >= HOME_SPACING_KM))
    if (fits.length === 0) continue
    const top = Math.max(...fits.map((c) => c.count))
    const best = fits.filter((c) => c.count === top).sort((a, b) => (a.site.id < b.site.id ? -1 : 1))
    homes[n.id] = best[Math.floor(rngFor(region.regionId + n.id)() * best.length)].site.id
  }
  return homes
}

/** npcId to the sites it calls home across every region stored on this phone. */
export function homesByNpc(docs: readonly GameDoc[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const d of docs) {
    if (!isNpcHomesDoc(d)) continue
    for (const [npcId, siteId] of Object.entries(d.homes)) (out[npcId] ??= []).push(siteId)
  }
  return out
}

// ---------- Meetings and progress ----------

export interface Meeting {
  npcId: string
  outingKey: string
  date: string
  place: string
}

const realOutings = (encounters: readonly Encounter[]) =>
  groupOutings(encounters.filter((e) => e.source !== 'sample')).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.key < b.key ? -1 : 1))

/**
 * Who you have met: an NPC is met at your first real outing at one of its home sites, and when it has a band, that outing must
 * include a sighting in that part of the day. Several can be met on one outing. Oldest meeting first.
 */
export function meetings(npcs: readonly Npc[], homes: Readonly<Record<string, readonly string[]>>, encounters: readonly Encounter[]): Meeting[] {
  const outings = realOutings(encounters)
  const out: Meeting[] = []
  for (const n of npcs) {
    const sites = new Set(homes[n.id] ?? [])
    if (sites.size === 0) continue
    const hit = outings.find((o) => o.siteId !== null && sites.has(o.siteId) && (n.band === null || o.encounters.some((e) => timeBand(e.time) === n.band)))
    if (hit) out.push({ npcId: n.id, outingKey: hit.key, date: hit.date, place: hit.place })
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** Dates of your real outings at the NPC's home sites (for the "returned" stage). */
export function homeOutingDates(npcId: string, homes: Readonly<Record<string, readonly string[]>>, encounters: readonly Encounter[]): string[] {
  const sites = new Set(homes[npcId] ?? [])
  return realOutings(encounters).filter((o) => o.siteId !== null && sites.has(o.siteId)).map((o) => o.date)
}

export type FolkStage = 'unmet' | 'met' | 'done' | 'returned'
/** The key in an NPC's saved answers that holds the date (YYYY-MM-DD) you finished their challenge. */
export const SOLVED_KEY = 'solved'

/**
 * unmet -> met (a meeting) -> done (challenge answered) -> returned (a real outing at the home site on a later date than `solved`).
 * Nothing is done or returned without a meeting, so removing the outing that met them takes it back.
 */
export function stage(npcId: string, allMeetings: readonly Meeting[], choices: Readonly<Record<string, string>> | undefined, outingDates: readonly string[]): FolkStage {
  if (!allMeetings.some((m) => m.npcId === npcId)) return 'unmet'
  const solved = choices?.[SOLVED_KEY]
  if (!solved || !/^\d{4}-\d{2}-\d{2}$/.test(solved)) return 'met'
  return outingDates.some((d) => d > solved) ? 'returned' : 'done'
}

/** What you told an NPC, from the stored game documents. */
export function choicesFor(docs: readonly GameDoc[], npcId: string): Record<string, string> | undefined {
  const d = docs.find((x) => x.id === `npc:${npcId}`)
  return isNpcDoc(d) ? d.choices : undefined
}

/** The stage of every NPC. */
export function stages(npcs: readonly Npc[], homes: Readonly<Record<string, readonly string[]>>, encounters: readonly Encounter[], docs: readonly GameDoc[]): Record<string, FolkStage> {
  const met = meetings(npcs, homes, encounters)
  const out: Record<string, FolkStage> = {}
  for (const n of npcs) out[n.id] = stage(n.id, met, choicesFor(docs, n.id), homeOutingDates(n.id, homes, encounters))
  return out
}

/** NPCs whose keepsake you have (done or later), in cast order. */
export const keepsakesEarned = (npcs: readonly Npc[], all: Readonly<Record<string, FolkStage>>): string[] => npcs.filter((n) => all[n.id] === 'done' || all[n.id] === 'returned').map((n) => n.id)

/** Pairs of NPCs whose connection is unlocked: both are done or later, and one lists the other. Each pair once, ids in order. */
export function connectionsUnlocked(npcs: readonly Npc[], all: Readonly<Record<string, FolkStage>>): [string, string][] {
  const done = (id: string) => all[id] === 'done' || all[id] === 'returned'
  const pairs = new Set<string>()
  for (const n of npcs) for (const c of n.connections) if (done(n.id) && done(c)) pairs.add([n.id, c].sort().join('|'))
  return [...pairs].sort().map((p) => p.split('|') as [string, string])
}

// ---------- Map presence ----------

export interface MapNpc {
  npcId: string
  siteId: string
  /** The home site's point, [longitude, latitude]. The screen offsets the sprite beside the pin. */
  point: [number, number]
  met: boolean
}

export interface MapNpcInput {
  /** npcId to siteId, for the region on screen. */
  homes: Readonly<Record<string, string>>
  sites: readonly Site[]
  met: ReadonlySet<string>
  zoom: number
  selectedSiteId: string | null
  /** The visible map box as [west, south, east, north]; homes outside it are left out. */
  bounds?: readonly [number, number, number, number]
  order?: readonly string[]
}

/** Which NPCs to draw: none below zoom 13, at most 3, the nearest to the selected site first. */
export function npcsOnMap(o: MapNpcInput): MapNpc[] {
  if (o.zoom < NPC_MAP_MIN_ZOOM) return []
  const sites = new Map(o.sites.map((s) => [s.id, s]))
  const anchor = o.selectedSiteId ? sites.get(o.selectedSiteId)?.point : o.bounds ? ([(o.bounds[0] + o.bounds[2]) / 2, (o.bounds[1] + o.bounds[3]) / 2] as [number, number]) : undefined
  const order = o.order ?? Object.keys(o.homes)
  const found: (MapNpc & { dist: number; rank: number })[] = []
  for (const npcId of Object.keys(o.homes)) {
    const site = sites.get(o.homes[npcId])
    if (!site) continue
    const [lng, lat] = site.point
    if (o.bounds && (lng < o.bounds[0] || lng > o.bounds[2] || lat < o.bounds[1] || lat > o.bounds[3])) continue
    found.push({ npcId, siteId: site.id, point: site.point, met: o.met.has(npcId), dist: anchor ? distanceKm(anchor, site.point) : 0, rank: order.indexOf(npcId) })
  }
  found.sort((a, b) => a.dist - b.dist || a.rank - b.rank)
  return found.slice(0, NPC_MAP_MAX).map(({ npcId, siteId, point, met }) => ({ npcId, siteId, point, met }))
}

const BAND_WORDS: Record<TimeBand, string> = { dawn: 'at dawn', day: 'in the daytime', dusk: 'at dusk', night: 'after dark' }

/** The line shown when you tap someone you have not met yet. */
export function meetHint(npc: Pick<Npc, 'name' | 'band'>): string {
  return npc.band ? `${npc.name} is usually here ${BAND_WORDS[npc.band]}. Log an outing here to meet them.` : `${npc.name} lives near here. Log an outing here to meet them.`
}

// ---------- Challenges ----------

export type Round =
  | { kind: 'pick-phrase' | 'pick-by-pose'; options: string[]; answerIndex: number }
  | { kind: 'match-swatch'; options: string[]; answerIndex: number }
  | { kind: 'count-flock'; bird: string; count: number }
  | { kind: 'spot'; cells: number; target: number }
  | { kind: 'choice'; options: string[] }

function shuffled<T>(list: readonly T[], seed: string): T[] {
  const a = [...list]
  const rng = rngFor(seed)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** The seed for an NPC's nth attempt, so a retry shows a different round. */
export const challengeSeed = (npcId: string, attempt: number): string => `${npcId}:${attempt}`

/** The round for a challenge and seed. The same seed always gives the same round; options are in display order. */
export function roundFor(c: Challenge, seed: string): Round {
  switch (c.kind) {
    case 'pick-phrase':
    case 'pick-by-pose': {
      const options = shuffled([c.bird, ...c.decoys], `${seed}|${c.kind}`)
      return { kind: c.kind, options, answerIndex: options.indexOf(c.bird) }
    }
    case 'match-swatch': {
      const options = shuffled([c.correct, ...c.decoys], `${seed}|swatch`)
      return { kind: 'match-swatch', options, answerIndex: options.indexOf(c.correct) }
    }
    case 'count-flock':
      return { kind: 'count-flock', bird: c.bird, count: c.min + Math.floor(rngFor(`${seed}|count`)() * (c.max - c.min + 1)) }
    case 'spot':
      return { kind: 'spot', cells: c.cells, target: Math.floor(rngFor(`${seed}|spot`)() * c.cells) }
    case 'choice':
      return { kind: 'choice', options: c.options.map((o) => o.id) }
  }
}

/**
 * Is the answer right? An index for pick-phrase, pick-by-pose, match-swatch and spot; a number of birds for count-flock (exactly,
 * no margin); an option id for choice, where any listed option is fine.
 */
export function checkAnswer(c: Challenge, seed: string, answer: number | string): boolean {
  const r = roundFor(c, seed)
  switch (r.kind) {
    case 'pick-phrase':
    case 'pick-by-pose':
    case 'match-swatch':
      return typeof answer === 'number' && answer === r.answerIndex
    case 'count-flock':
      return typeof answer === 'number' && answer === r.count
    case 'spot':
      return typeof answer === 'number' && answer === r.target
    case 'choice':
      return typeof answer === 'string' && r.options.includes(answer)
  }
}

/**
 * What to save after an answer: nothing for a wrong answer (try again), else the finished date, and for a choice the option picked.
 * Save each entry with `setNpcChoice(npcId, key, value)`.
 */
export function answerToStore(c: Challenge, seed: string, answer: number | string, today: string): Record<string, string> {
  if (!checkAnswer(c, seed, answer)) return {}
  return c.kind === 'choice' ? { [SOLVED_KEY]: today, choice: String(answer) } : { [SOLVED_KEY]: today }
}
