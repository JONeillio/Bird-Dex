import { describe, expect, it } from 'vitest'
import type { Warden } from '../src/data/game'
import { CallRecordSchema, asCallRecord, type CallRecord } from '../src/data/personal/game-schema'
import type { Encounter } from '../src/data/personal-schema'
import type { RegionData, Report, Site } from '../src/data/published-schema'
import { earnedBadges } from '../src/domain/badges'
import { BOSS_MIN_DAYS, callDate, callPoints, callWinsOf, lifeNamesOf, makeCall, reportKey, settle, wardenCalls } from '../src/domain/callIt'

const bit = (...d: number[]) => d.reduce((m, x) => m | (1 << x), 0)
const rep = (speciesId: string | null, name: string, over: Partial<Report> = {}): Report => ({
  speciesId, ebirdCode: `c${name.replace(/\W/g, '').toLowerCase()}`, name, sciName: `Fakeus ${name.replace(/\W/g, '').toLowerCase()}`,
  obsDate: '2026-11-06', obsTime: '07:30', count: null, checklistUrl: null, reviewed: true, ...over,
})
const mkSite = (id: string, reports: Report[]): Site => ({ id, name: 'Reedbed Marsh', point: [-2.3, 53.4], url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports })
const mkRegion = (sites: Site[]): RegionData => ({
  schema: 1, regionId: 'r', generatedAt: '2026-11-08T06:00:00Z', isDemo: false, windowDays: 14,
  coverage: { hotspotsListed: 0, hotspotsActive: 0, reportsFetchedFor: 0, truncated: false, note: '' },
  sites, drive: { computedAt: null, byStart: {} }, unmatchedSpecies: [],
})
const warden: Warden = { id: 'maud-r', persona: 'maud', siteId: 'L1', siteName: 'Reedbed Marsh', habitat: 'wetland', signature: ['mute-swan', 'gadwall', 'eurasian-teal'], boss: 'mute-swan' }
const common = { sciName: 'Fakeus common' }
/** 40 other sites that all report "Commonbird"; a bird seen at only one of 41 sites is under 3% (scarce). */
const filler = (n = 40): Site[] => Array.from({ length: n }, (_, i) => mkSite(`F${i}`, [rep('common-bird', 'Commonbird', common)]))

let n = 0
function enc(over: Partial<Encounter> = {}): Encounter {
  n += 1
  return {
    id: `enc${String(n).padStart(6, '0')}`, speciesId: 'gadwall', date: '2026-11-09', place: 'Reedbed', mode: 'seen', notes: '', photo: null,
    createdAt: '2026-11-09T09:00:00.000Z', siteId: 'L1', ...over,
  }
}

const NOW = new Date(2026, 10, 8, 12, 0) // Sunday 8 Nov 2026, local noon

describe('callPoints', () => {
  it('follows the tiers', () => {
    expect(['common', 'fairly-common', 'uncommon', 'scarce', 'rare', 'unreported', 'unknown'].map((t) => callPoints(t as never))).toEqual([1, 1, 2, 3, 4, 4, 1])
  })
})

describe('wardenCalls', () => {
  it('takes the five most-reported birds, ties to the newest, boss only if reported on 3+ days', () => {
    const site = mkSite('L1', [
      rep('a', 'A', { days: bit(0, 1, 2, 3, 4, 5), ...common }), rep('b', 'B', { days: bit(0, 1, 2, 3), ...common }), rep('c', 'C', { days: bit(0, 1, 2), ...common }),
      rep('d', 'D', { days: bit(0, 1), ...common }), rep('e', 'E', { days: bit(0), ...common }), rep('f', 'F', { days: bit(0), obsDate: '2026-11-01', ...common }),
      rep('mute-swan', 'Mute Swan', { days: bit(0, 1), ...common }), // the boss, only 2 days
    ])
    const calls = wardenCalls(warden, site, mkRegion([site, ...filler(5)]))
    expect(calls.map((c) => c.key)).toEqual(['a', 'b', 'c', 'd', 'e'])
    const boosted = { ...site, reports: site.reports.map((r) => (r.speciesId === 'mute-swan' ? { ...r, days: bit(0, 1, BOSS_MIN_DAYS - 1) } : r)) }
    expect(wardenCalls(warden, boosted, mkRegion([boosted, ...filler(5)])).map((c) => c.key)).toEqual(['a', 'b', 'c', 'mute-swan', 'd'])
  })

  it('falls back to the newest reports when there is no history, and leaves the boss out (it cannot be shown to be reliable)', () => {
    const site = mkSite('L1', [
      rep('a', 'A', { obsDate: '2026-11-01', ...common }), rep('b', 'B', { obsDate: '2026-11-07', ...common }), rep('c', 'C', { obsDate: '2026-11-05', ...common }),
      rep('mute-swan', 'Mute Swan', { obsDate: '2026-11-08', ...common }),
    ])
    expect(wardenCalls(warden, site, mkRegion([site])).map((c) => c.key)).toEqual(['b', 'c', 'a'])
  })

  it('gives each bird its points from the rarity table, keys outside-Dex birds, and is empty without a site', () => {
    const site = mkSite('L1', [rep(null, 'Zeta Warbler', { days: bit(0, 1), sciName: 'Zetus warbleri' }), rep('gadwall', 'Gadwall', { days: bit(0), ...common })])
    const calls = wardenCalls(warden, site, mkRegion([site, ...filler()]))
    expect(calls[0]).toEqual({ key: 'x-zetus-warbleri', name: 'Zeta Warbler', pts: 3 }) // 1 of 41 sites: scarce
    expect(calls[1].pts).toBe(1) // common
    expect(wardenCalls(warden, null, mkRegion([]))).toEqual([])
  })
})

describe('makeCall', () => {
  const site = mkSite('L1', [rep('a', 'A', { days: bit(0, 1), ...common }), rep('b', 'B', { days: bit(0), ...common })])
  const elsewhere = mkSite('L2', [rep('far-bird', 'Far Bird', { sciName: 'Fakeus farbird' })])
  const region = mkRegion([site, elsewhere, ...filler()])
  const base = { warden, site, region, lifeList: new Map([['old-friend', 'Old Friend']]), now: NOW }

  it('freezes points, the warden’s five and a seven-day expiry (local dates)', () => {
    const r = makeCall({ ...base, player: ['far-bird', 'a'] })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.call.id).toMatch(/^call:maud-r:\d{14}$/)
    expect(r.call.siteId).toBe('L1')
    expect(r.call.madeAt).toBe(NOW.toISOString())
    expect(r.call.expiresOn).toBe('2026-11-15')
    expect(callDate(r.call)).toBe('2026-11-08')
    expect(r.call.player.map((p) => [p.key, p.pts])).toEqual([['far-bird', 3], ['a', 1]])
    expect(r.call.warden.map((p) => p.key)).toEqual(['a', 'b'])
    expect(CallRecordSchema.safeParse(r.call).success).toBe(true)
  })

  it('accepts a bird from your life list, and refuses unknown birds, repeats, none and too many', () => {
    const own = makeCall({ ...base, player: ['old-friend'] })
    expect(own.ok && own.call.player[0]).toMatchObject({ key: 'old-friend', name: 'Old Friend' })
    expect(makeCall({ ...base, player: ['nope'] })).toEqual({ ok: false, reason: 'unknown-bird' })
    expect(makeCall({ ...base, player: ['a', 'a'] })).toEqual({ ok: false, reason: 'repeat' })
    expect(makeCall({ ...base, player: [] })).toEqual({ ok: false, reason: 'none' })
    expect(makeCall({ ...base, player: ['a', 'b', 'far-bird', 'old-friend', 'common-bird', 'a'] })).toEqual({ ok: false, reason: 'too-many' })
  })

  it('stored points do not move when the data changes later', () => {
    const r = makeCall({ ...base, player: ['far-bird'] })
    if (!r.ok) throw new Error('should be ok')
    const later = mkRegion([site, ...filler(), ...Array.from({ length: 20 }, (_, i) => mkSite(`G${i}`, [rep('far-bird', 'Far Bird', { sciName: 'Fakeus farbird' })]))])
    const again = makeCall({ ...base, region: later, player: ['far-bird'] })
    expect(again.ok && again.call.player[0].pts).not.toBe(r.call.player[0].pts)
    expect(r.call.player[0].pts).toBe(3)
  })

  it('works out life-list names from sightings', () => {
    expect(lifeNamesOf([enc({ speciesId: 'gadwall' }), enc({ speciesId: 'x-zetus-warbleri', name: 'Zeta Warbler' })]).get('x-zetus-warbleri')).toBe('Zeta Warbler')
    expect(reportKey({ speciesId: null, sciName: 'Zetus warbleri' })).toBe('x-zetus-warbleri')
  })
})

describe('settle', () => {
  const pick = (key: string, pts: number) => ({ key, name: key.toUpperCase(), pts })
  const call: CallRecord = {
    id: 'call:maud-r:20261108120000', wardenId: 'maud-r', siteId: 'L1', madeAt: '2026-11-08T12:00:00.000Z', expiresOn: '2026-11-15',
    player: [pick('gadwall', 2), pick('teal', 1)], warden: [pick('gadwall', 2), pick('coot', 1), pick('swan', 3)],
  }
  const at = (speciesId: string, over: Partial<Encounter> = {}) => enc({ speciesId, ...over })

  it('scores both sides from the first qualifying outing', () => {
    const s = settle(call, [at('gadwall'), at('teal'), at('teal', { date: '2026-11-12', createdAt: '2026-11-12T10:00:00.000Z' })], NOW)
    expect(s).toMatchObject({ result: 'win', player: 3, warden: 2, outingDate: '2026-11-09' }) // gadwall counts for both sides
  })
  it('loss when she bets better, draw on a tie', () => {
    expect(settle(call, [at('swan')], NOW)).toMatchObject({ result: 'loss', player: 0, warden: 3 })
    expect(settle(call, [at('teal'), at('coot')], NOW)).toMatchObject({ result: 'draw', player: 1, warden: 1 })
    expect(settle(call, [at('gadwall')], NOW).hits).toEqual([{ key: 'gadwall', name: 'GADWALL', byPlayer: true, byWarden: true }])
  })
  it('settles on the first outing only, not later ones', () => {
    const s = settle(call, [at('coot'), at('gadwall', { date: '2026-11-12', createdAt: '2026-11-12T10:00:00.000Z' })], NOW)
    expect(s).toMatchObject({ outingDate: '2026-11-09', player: 0, warden: 1, result: 'loss' })
  })
  it('importing an older checklist cannot settle it (dated before the call, or added before it)', () => {
    expect(settle(call, [at('gadwall', { date: '2026-11-07', createdAt: '2026-11-09T09:00:00.000Z' })], NOW).result).toBe('pending')
    expect(settle(call, [at('gadwall', { date: '2026-11-08', createdAt: '2026-11-08T08:00:00.000Z' })], NOW).result).toBe('pending')
  })
  it('ignores sample sightings, other sites, undated sightings and dates after expiry', () => {
    const noise = [at('gadwall', { source: 'sample' }), at('gadwall', { siteId: 'L2' }), at('gadwall', { siteId: null }), at('gadwall', { date: null }), at('gadwall', { date: '2026-11-16' })]
    expect(settle(call, noise, NOW).result).toBe('pending')
  })
  it('is pending until the expiry date, then expired', () => {
    expect(settle(call, [], new Date(2026, 10, 15, 23, 0)).result).toBe('pending')
    expect(settle(call, [], new Date(2026, 10, 16, 0, 5)).result).toBe('expired')
  })
  it('counts an eBird import added after the call, dated inside the window', () => {
    expect(settle(call, [at('teal', { source: 'ebird', date: '2026-11-08', createdAt: '2026-11-08T18:00:00.000Z' })], NOW).result).toBe('win')
  })
})

describe('gold badge from a Call it win', () => {
  const sig = warden.signature
  const real = sig.map((speciesId) => enc({ speciesId, date: '2026-05-01', createdAt: '2026-05-01T10:00:00.000Z' }))
  const input = (extra: object = {}) => ({ encounters: real, wardens: [{ id: warden.id, siteId: 'L1', signature: sig, boss: warden.boss }], year: 2026, ...extra })
  const call: CallRecord = {
    id: 'call:maud-r:20261108120000', wardenId: warden.id, siteId: 'L1', madeAt: '2026-11-08T12:00:00.000Z', expiresOn: '2026-11-15',
    player: [{ key: 'gadwall', name: 'Gadwall', pts: 2 }], warden: [{ key: 'eurasian-teal', name: 'Teal', pts: 1 }],
  }
  const trip = [enc({ speciesId: 'gadwall', date: '2026-11-09', createdAt: '2026-11-09T09:00:00.000Z' })]

  it('silver without a win, gold with one', () => {
    expect(earnedBadges(input()).wardens[0].tier).toBe('silver')
    const wins = callWinsOf([call], [...real, ...trip], NOW)
    expect(wins).toEqual({ [warden.id]: '2026-11-09' })
    expect(earnedBadges(input({ callWins: wins })).wardens[0].tier).toBe('gold')
  })
  it('a loss, a draw, a pending call, a sample trip and a damaged record earn nothing', () => {
    const loss = [enc({ speciesId: 'eurasian-teal', date: '2026-11-09', createdAt: '2026-11-09T09:00:00.000Z' })]
    expect(callWinsOf([call], [...real, ...loss], NOW)).toEqual({})
    expect(callWinsOf([call], real, NOW)).toEqual({})
    expect(callWinsOf([call], [...real, ...trip.map((e) => ({ ...e, source: 'sample' as const }))], NOW)).toEqual({})
    expect(callWinsOf([{ id: 'call:bad', wardenId: 'x', siteId: 'L1', madeAt: '2026-11-08T12:00:00.000Z', expiresOn: '2026-11-15' }], trip, NOW)).toEqual({})
    expect(asCallRecord({ id: 'call:bad', wardenId: 'x', siteId: 'L1', madeAt: '2026-11-08T12:00:00.000Z', expiresOn: '2026-11-15' })).toBeNull()
  })
  it('the demo collection still earns nothing, and the old duelWins option still works', () => {
    expect(earnedBadges(input({ callWins: { [warden.id]: '2026-11-09' }, demoCollection: true })).wardens[0].tier).toBe('none')
    expect(earnedBadges(input({ duelWins: { [warden.id]: '2026-11-09' } })).wardens[0].tier).toBe('gold')
  })
})
