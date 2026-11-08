// Field Duels: best of five rounds, scored from traits and your own sightings. Pure and deterministic.
// Birds fit a condition card by habitat and traits; your own sightings in matching conditions add affinity;
// a well-known bird (Seasoned or Old Friend) adds a Bond point. The same engine runs wardens now and rivals later.
import { dexById } from '../data/catalogue'
import type { Encounter } from '../data/personal-schema'
import { validSiteId } from '../data/personal-schema'
import type { Site } from '../data/published-schema'
import { DUEL_CARDS, ruleKey, SIZES, traitsById, type DuelCard, type Rule, type Traits } from '../data/game'
import type { SetId } from '../data/schema'
import type { Bond } from './bond'
import { rngFor } from './random'
import { siteCharacter } from './siteCharacter'
import { monthOf, timeBand, type TimeBand } from './time'

export const DUEL_ROUNDS = 5
export const SQUAD_MAX = 6
export const SQUAD_MIN = 3

// ---------- fit ----------

export function ruleMatches(rule: Rule, traits: Traits): boolean {
  const key = ruleKey(rule)
  if (key === 'songster') return traits.songster === (rule as { songster: boolean }).songster
  const accepted = (rule as unknown as Record<string, readonly string[]>)[key]
  return accepted.includes(traits[key] as string)
}

export interface FitBreakdown {
  /** True when the bird's habitat sets match the card (or the card has no habitat, so every bird gets it). */
  habitat: boolean
  /** The rules the bird's traits satisfy, for the flavour line. */
  matched: Rule[]
  /** 0-3. */
  fit: number
}

export function fitBreakdown(speciesId: string, card: DuelCard): FitBreakdown {
  const dex = dexById(speciesId)
  const traits = traitsById(speciesId)
  if (!dex || !traits) return { habitat: false, matched: [], fit: 0 }
  const habitat = card.sets.length === 0 || dex.sets.some((s) => card.sets.includes(s))
  const matched = card.rules.filter((r) => ruleMatches(r, traits))
  return { habitat, matched, fit: (habitat ? 1 : 0) + matched.length }
}

export const fitOf = (speciesId: string, card: DuelCard): number => fitBreakdown(speciesId, card).fit

// ---------- affinity ----------

/** 0 sightings in matching conditions = 0, 1-2 = 1, 3 or more = 2. */
export function affinityLevel(count: number): 0 | 1 | 2 {
  return count >= 3 ? 2 : count >= 1 ? 1 : 0
}

/** Habitat character of each public site (from the birds reported there), keyed by eBird hotspot id. */
export function siteCharacters(sites: readonly Pick<Site, 'id' | 'reports'>[]): Map<string, SetId[]> {
  return new Map(sites.map((s) => [s.id, siteCharacter(s)]))
}

/**
 * Affinity from your own sightings of one bird. `heard` cards count heard or seen-and-heard sightings;
 * other cards need the sighting's site character, month and time band to match. A sighting with no known
 * site only matches cards with no habitat.
 */
export function affinityFor(speciesId: string, card: DuelCard, encounters: readonly Encounter[], siteChars: ReadonlyMap<string, readonly SetId[]>): 0 | 1 | 2 {
  let count = 0
  for (const e of encounters) {
    if (e.speciesId !== speciesId) continue
    if (card.affinity === 'heard') {
      if (e.mode === 'heard' || e.mode === 'both') count++
      continue
    }
    if (card.sets.length > 0) {
      const id = validSiteId(e.siteId)
      const chars = id ? siteChars.get(id) : undefined
      if (!chars || !chars.some((s) => card.sets.includes(s))) continue
    }
    if (card.months) {
      const m = monthOf(e.date)
      if (m === null || !card.months.includes(m)) continue
    }
    if (card.band && timeBand(e.time) !== card.band) continue
    count++
  }
  return affinityLevel(count)
}

// ---------- fighters and scores ----------

export interface Fighter {
  id: string
  /** 1 for Seasoned or Old Friend, otherwise 0. */
  bond: 0 | 1
  affinity: (card: DuelCard) => number
}

export interface Score {
  fit: number
  affinity: number
  bond: number
  /** 0-6. */
  total: number
}

export function scoreOf(f: Fighter, card: DuelCard): Score {
  const fit = fitOf(f.id, card)
  const affinity = f.affinity(card)
  return { fit, affinity, bond: f.bond, total: fit + affinity + f.bond }
}

export const bondPointFor = (b: Bond | undefined): 0 | 1 => (b && b.rankIndex >= 3 ? 1 : 0)

/** One of your birds, with affinity worked out from your own sightings. */
export function playerFighter(speciesId: string, bond: Bond | undefined, encounters: readonly Encounter[], siteChars: ReadonlyMap<string, readonly SetId[]>): Fighter {
  const mine = encounters.filter((e) => e.speciesId === speciesId)
  const cache = new Map<string, number>()
  return {
    id: speciesId,
    bond: bondPointFor(bond),
    affinity: (card) => {
      let v = cache.get(card.id)
      if (v === undefined) cache.set(card.id, (v = affinityFor(speciesId, card, mine, siteChars)))
      return v
    },
  }
}

// ---------- squads ----------

const dexNoOf = (id: string) => dexById(id)?.dexNo ?? 9999
const sizeIndex = (id: string) => {
  const t = traitsById(id)
  return t ? SIZES.indexOf(t.size) : -1
}

/** Your default squad: the six Starter Dex birds with the most Bond points (ties: lower Dex number). */
export function defaultSquad(bond: ReadonlyMap<string, Bond>): string[] {
  return [...bond.entries()]
    .filter(([id]) => traitsById(id))
    .sort((a, b) => b[1].points - a[1].points || dexNoOf(a[0]) - dexNoOf(b[0]))
    .slice(0, SQUAD_MAX)
    .map(([id]) => id)
}

/** Your chosen squad (prefs), keeping only recorded Starter Dex birds, at most six; the default when none is usable. */
export function resolveSquad(chosen: readonly string[], bond: ReadonlyMap<string, Bond>): string[] {
  const ok = [...new Set(chosen)].filter((id) => bond.has(id) && traitsById(id)).slice(0, SQUAD_MAX)
  return ok.length > 0 ? ok : defaultSquad(bond)
}

/**
 * The warden's squad: the boss (always), plus the five Starter Dex birds reported at the site with the highest
 * total fit over the drawn cards (ties: lower Dex number). Home ground gives every warden bird affinity 1,
 * and the boss one more. Fewer reported birds means a smaller squad.
 */
export function wardenSquad(bossId: string, site: Pick<Site, 'reports'>, cards: readonly DuelCard[]): Fighter[] {
  const reported = new Set<string>()
  for (const r of site.reports) if (r.speciesId && r.speciesId !== bossId && traitsById(r.speciesId)) reported.add(r.speciesId)
  const total = (id: string) => cards.reduce((t, c) => t + fitOf(id, c), 0)
  const five = [...reported].sort((a, b) => total(b) - total(a) || dexNoOf(a) - dexNoOf(b)).slice(0, 5)
  return [
    { id: bossId, bond: 0, affinity: () => 2 },
    ...five.map((id): Fighter => ({ id, bond: 0, affinity: () => 1 })),
  ]
}

// ---------- the draw ----------

export interface DrawOptions {
  /** `siteId + YYYY-MM-DD` for wardens (`rivalName + date` for rivals), so a day's duel is always the same. */
  seed: string
  /** 1-12. */
  month: number
  /** The current time band, if the time is known. */
  band: TimeBand | null
  /** The site's habitat character, or null to allow every card (rival duels). */
  siteSets: readonly SetId[] | null
  rounds?: number
}

function shuffled<T>(list: readonly T[], rng: () => number): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Five distinct cards, valid for the month and fitting the site where possible. Short of five, other
 * month-valid cards fill in, then any card. A card whose time band matches now is round 1.
 */
export function drawCards(o: DrawOptions, cards: readonly DuelCard[] = DUEL_CARDS): DuelCard[] {
  const want = o.rounds ?? DUEL_ROUNDS
  const rng = rngFor(o.seed)
  const inMonth = (c: DuelCard) => !c.months || c.months.includes(o.month)
  const fitsSite = (c: DuelCard) => o.siteSets === null || c.sets.length === 0 || c.sets.some((s) => o.siteSets!.includes(s))
  const pool = shuffled(cards.filter((c) => inMonth(c) && fitsSite(c)), rng)
  const seen = new Set(pool.map((c) => c.id))
  const extra = shuffled(cards.filter((c) => inMonth(c) && !seen.has(c.id)), rng)
  extra.forEach((c) => seen.add(c.id))
  const rest = shuffled(cards.filter((c) => !seen.has(c.id)), rng)
  const ordered = [...pool, ...extra, ...rest]
  const first = o.band ? [...pool, ...extra].find((c) => c.band === o.band) : undefined
  const picked = first ? [first, ...ordered.filter((c) => c.id !== first.id)] : ordered
  return picked.slice(0, want)
}

// ---------- the duel ----------

export interface Duel {
  cards: DuelCard[]
  player: Fighter[]
  opponent: Fighter[]
  /** The warden's boss bird; null for rivals. */
  bossId: string | null
  /** min(5, cards, your birds, their birds). */
  rounds: number
}

export interface RoundResult {
  /** 1-based. */
  round: number
  card: DuelCard
  playerId: string
  opponentId: string
  player: Score
  opponent: Score
  winner: 'player' | 'opponent' | 'tie'
}

export function buildDuel(cards: DuelCard[], player: Fighter[], opponent: Fighter[], bossId: string | null): Duel {
  return { cards, player, opponent, bossId, rounds: Math.min(DUEL_ROUNDS, cards.length, player.length, opponent.length) }
}

export interface Tally {
  playerWins: number
  opponentWins: number
  ties: number
}
export function tally(results: readonly RoundResult[]): Tally {
  return {
    playerWins: results.filter((r) => r.winner === 'player').length,
    opponentWins: results.filter((r) => r.winner === 'opponent').length,
    ties: results.filter((r) => r.winner === 'tie').length,
  }
}

export interface Outcome extends Tally {
  done: boolean
  /** null until every round is played. Equal rounds won is a draw. */
  result: 'win' | 'lose' | 'draw' | null
}
export function outcome(duel: Duel, results: readonly RoundResult[]): Outcome {
  const t = tally(results)
  const done = results.length >= duel.rounds
  return { ...t, done, result: !done ? null : t.playerWins > t.opponentWins ? 'win' : t.playerWins < t.opponentWins ? 'lose' : 'draw' }
}

/**
 * The warden's pick for a round: the unused bird with the best score for the card (ties: bigger size, then lower
 * Dex number). The boss is held back unless it is the last round, you lead by two or more after round 3, or he is all that is left.
 */
export function chooseOpponent(duel: Duel, results: readonly RoundResult[]): Fighter {
  const roundIndex = results.length
  const card = duel.cards[roundIndex]
  const used = new Set(results.map((r) => r.opponentId))
  const unused = duel.opponent.filter((f) => !used.has(f.id))
  const t = tally(results)
  const bossAllowed =
    duel.bossId !== null &&
    (roundIndex === duel.rounds - 1 || (results.length >= 3 && t.playerWins - t.opponentWins >= 2) || unused.every((f) => f.id === duel.bossId))
  const candidates = unused.filter((f) => f.id !== duel.bossId || bossAllowed)
  return [...candidates].sort(
    (a, b) => scoreOf(b, card).total - scoreOf(a, card).total || sizeIndex(b.id) - sizeIndex(a.id) || dexNoOf(a.id) - dexNoOf(b.id),
  )[0]
}

/** Play the next round with one of your unused birds. The warden answers by its rule. */
export function playRound(duel: Duel, results: readonly RoundResult[], playerId: string): RoundResult {
  if (results.length >= duel.rounds) throw new Error('The duel is over.')
  const mine = duel.player.find((f) => f.id === playerId)
  if (!mine) throw new Error(`${playerId} is not in your squad.`)
  if (results.some((r) => r.playerId === playerId)) throw new Error(`${playerId} has already played.`)
  const card = duel.cards[results.length]
  const theirs = chooseOpponent(duel, results)
  const player = scoreOf(mine, card)
  const opponent = scoreOf(theirs, card)
  return {
    round: results.length + 1,
    card,
    playerId,
    opponentId: theirs.id,
    player,
    opponent,
    winner: player.total > opponent.total ? 'player' : player.total < opponent.total ? 'opponent' : 'tie',
  }
}

/** Your best unused bird for the current round (a hint, and the default for skipping ahead). */
export function bestPlayerPick(duel: Duel, results: readonly RoundResult[]): string {
  const used = new Set(results.map((r) => r.playerId))
  const card = duel.cards[results.length]
  return [...duel.player.filter((f) => !used.has(f.id))].sort(
    (a, b) => scoreOf(b, card).total - scoreOf(a, card).total || dexNoOf(a.id) - dexNoOf(b.id),
  )[0].id
}

// ---------- setting up a warden duel ----------

export interface WardenDuelSetup {
  warden: { id: string; siteId: string; boss: string }
  /** The warden's site in the current data (its reports make the live team). */
  site: Pick<Site, 'id' | 'reports'>
  /** Squad ids from prefs. */
  squad: readonly string[]
  encounters: readonly Encounter[]
  bond: ReadonlyMap<string, Bond>
  siteChars: ReadonlyMap<string, readonly SetId[]>
  /** YYYY-MM-DD */
  date: string
  /** HH:MM now, or null. */
  time: string | null
}

/** A warden duel for today, or null when you need more recorded birds (at least three) in your squad. */
export function setupWardenDuel(o: WardenDuelSetup): Duel | null {
  const ids = resolveSquad(o.squad, o.bond)
  if (ids.length < SQUAD_MIN) return null
  const cards = drawCards({
    seed: `${o.warden.siteId}${o.date}`,
    month: monthOf(o.date) ?? 1,
    band: timeBand(o.time),
    siteSets: siteCharacter(o.site),
  })
  const player = ids.map((id) => playerFighter(id, o.bond.get(id), o.encounters, o.siteChars))
  return buildDuel(cards, player, wardenSquad(o.warden.boss, o.site, cards), o.warden.boss)
}
