// Call it (AUTOPILOT P11): the contest with a Reserve Warden. Before a trip you "call" up to five birds you expect to log at her
// site; she calls five of her own (the ones reported on most days lately). Rarer birds score more. You settle it with your
// first real outing at the site within seven days. Pure. Sample history never settles a call.
import { dexById } from '../data/catalogue'
import type { Warden } from '../data/game'
import { asCallRecord, type CallPick, type CallRecord, type GameDoc } from '../data/personal/game-schema'
import type { Encounter } from '../data/personal-schema'
import type { RegionData, Report, Site } from '../data/published-schema'
import { daysReported } from './reliability'
import { buildRarity, rarityOf, type RarityTable, type RarityTier } from './rarity'
import { outsideId } from './taxon'

export type { CallPick, CallRecord }

export const CALL_DAYS = 7
export const MAX_CALLS_PER_SIDE = 5
/** The warden bets on her boss only if it has been reported on at least this many days lately. */
export const BOSS_MIN_DAYS = 3

/** Points for a bird, from its rarity tier at the time of calling. No region data at all ("unknown") counts as 1. */
export function callPoints(tier: RarityTier): number {
  switch (tier) {
    case 'rare':
    case 'unreported':
      return 4
    case 'scarce':
      return 3
    case 'uncommon':
      return 2
    default:
      return 1
  }
}

/** The key a bird is called and scored by: the Starter Dex id, else the `x-` id from its scientific name. */
export const reportKey = (r: Pick<Report, 'speciesId' | 'sciName'>): string => r.speciesId ?? outsideId(r.sciName)

const stamp = (r: Report): string => `${r.obsDate}T${r.obsTime ?? '23:59'}`

function pickOf(r: Report, rarity: RarityTable): CallPick {
  return { key: reportKey(r), name: r.name, pts: callPoints(rarityOf(rarity, r.sciName).tier) }
}

/**
 * The warden's five: birds reported at her site, most days first (newest report when there is no history yet). Her boss is
 * a candidate only if it has been reported on 3 or more days, which needs the report history. Fewer than five if the site has fewer.
 */
export function wardenCalls(warden: Warden, site: Site | null, region: RegionData, rarity?: RarityTable): CallPick[] {
  if (!site) return []
  const table = rarity ?? buildRarity(region)
  const best = new Map<string, Report>()
  for (const r of site.reports) {
    const k = reportKey(r)
    const have = best.get(k)
    if (!have || stamp(r) > stamp(have) || (stamp(r) === stamp(have) && (daysReported(r.days) ?? -1) > (daysReported(have.days) ?? -1))) best.set(k, r)
  }
  const candidates = [...best.values()].filter((r) => reportKey(r) !== warden.boss || (daysReported(r.days) ?? 0) >= BOSS_MIN_DAYS)
  candidates.sort((a, b) => (daysReported(b.days) ?? -1) - (daysReported(a.days) ?? -1) || stamp(b).localeCompare(stamp(a)) || a.name.localeCompare(b.name))
  return candidates.slice(0, MAX_CALLS_PER_SIDE).map((r) => pickOf(r, table))
}

const pad = (n: number) => String(n).padStart(2, '0')
/** The phone's own calendar date as YYYY-MM-DD. */
export const localDate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function addDays(date: string, days: number): string {
  const d = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)) + days))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** The date a call was made (local), worked back from its expiry. */
export const callDate = (call: Pick<CallRecord, 'expiresOn'>): string => addDays(call.expiresOn, -CALL_DAYS)

/** Names for birds on your life list, keyed the same way as calls, so you can call a bird that is not reported nearby. */
export function lifeNamesOf(encounters: readonly Encounter[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const e of encounters) if (!out.has(e.speciesId)) out.set(e.speciesId, dexById(e.speciesId)?.name ?? e.name ?? e.speciesId)
  return out
}

export interface MakeCallInput {
  warden: Warden
  /** The warden's own site in the published data (null when it has left the data, so she calls nothing). */
  site: Site | null
  region: RegionData
  /** Bird keys you are calling (1 to 5, no repeats). Each must be reported somewhere in the region or on your life list. */
  player: readonly string[]
  /** Bird keys and names from your life list (`lifeNamesOf`). */
  lifeList: ReadonlyMap<string, string>
  now: Date
  rarity?: RarityTable
}
export type MakeCallResult = { ok: true; call: CallRecord } | { ok: false; reason: 'none' | 'too-many' | 'repeat' | 'unknown-bird' }

export function makeCall(o: MakeCallInput): MakeCallResult {
  if (o.player.length === 0) return { ok: false, reason: 'none' }
  if (o.player.length > MAX_CALLS_PER_SIDE) return { ok: false, reason: 'too-many' }
  if (new Set(o.player).size !== o.player.length) return { ok: false, reason: 'repeat' }
  const table = o.rarity ?? buildRarity(o.region)
  const reported = new Map<string, Report>()
  for (const s of o.region.sites) for (const r of s.reports) if (!reported.has(reportKey(r))) reported.set(reportKey(r), r)
  const player: CallPick[] = []
  for (const key of o.player) {
    const r = reported.get(key)
    if (r) player.push(pickOf(r, table))
    else if (o.lifeList.has(key)) player.push({ key, name: o.lifeList.get(key)!, pts: callPoints(rarityOf(table, dexById(key)?.sciName ?? null).tier) })
    else return { ok: false, reason: 'unknown-bird' }
  }
  const madeAt = o.now.toISOString()
  const compact = madeAt.slice(0, 19).replace(/[-:T]/g, '')
  return {
    ok: true,
    call: {
      id: `call:${o.warden.id}:${compact}`,
      wardenId: o.warden.id,
      siteId: o.warden.siteId,
      madeAt,
      expiresOn: addDays(localDate(o.now), CALL_DAYS),
      player,
      warden: wardenCalls(o.warden, o.site, o.region, table),
    },
  }
}

export type CallResult = 'win' | 'draw' | 'loss' | 'pending' | 'expired'
export interface Settlement {
  result: CallResult
  /** Points from your calls that you logged. */
  player: number
  /** Points from her calls that you logged (she is betting on what you will find). */
  warden: number
  /** The outing that settled it, else null. */
  outingDate: string | null
  /** The birds logged on that outing that either side called. */
  hits: { key: string; name: string; byPlayer: boolean; byWarden: boolean }[]
}

/**
 * The first real outing at the site dated from the day of the call to its expiry, using only sightings added after the call was made
 * (so importing an old checklist cannot settle it). No such outing yet: pending until the expiry date, then expired.
 */
export function settle(call: CallRecord, encounters: readonly Encounter[], now: Date): Settlement {
  const from = callDate(call)
  const madeMs = Date.parse(call.madeAt)
  const qualifying = encounters.filter(
    (e) => e.source !== 'sample' && e.date !== null && e.siteId === call.siteId && e.date >= from && e.date <= call.expiresOn && Date.parse(e.createdAt) > madeMs,
  )
  if (qualifying.length === 0) return { result: localDate(now) <= call.expiresOn ? 'pending' : 'expired', player: 0, warden: 0, outingDate: null, hits: [] }
  const outingDate = qualifying.map((e) => e.date!).sort()[0]
  const logged = new Set(qualifying.filter((e) => e.date === outingDate).map((e) => e.speciesId))
  const sum = (picks: readonly CallPick[]) => picks.filter((p) => logged.has(p.key)).reduce((n, p) => n + p.pts, 0)
  const player = sum(call.player)
  const warden = sum(call.warden)
  const keys = new Set([...call.player, ...call.warden].map((p) => p.key))
  const hits = [...keys]
    .filter((k) => logged.has(k))
    .map((k) => {
      const p = call.player.find((x) => x.key === k)
      const w = call.warden.find((x) => x.key === k)
      return { key: k, name: (p ?? w)!.name, byPlayer: !!p, byWarden: !!w }
    })
  return { result: player > warden ? 'win' : player < warden ? 'loss' : 'draw', player, warden, outingDate, hits }
}

/** wardenId to the date of your first winning Call it against her (the outing date). Feeds the gold badge. */
export function callWinsOf(docs: readonly GameDoc[], encounters: readonly Encounter[], now: Date): Record<string, string> {
  const wins: Record<string, string> = {}
  for (const doc of docs) {
    const call = asCallRecord(doc)
    if (!call) continue
    const s = settle(call, encounters, now)
    if (s.result === 'win' && s.outingDate && (!wins[call.wardenId] || s.outingDate < wins[call.wardenId])) wins[call.wardenId] = s.outingDate
  }
  return wins
}
