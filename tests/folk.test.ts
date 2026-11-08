import { describe, expect, it } from 'vitest'
import { NPCS } from '../src/art/npcs'
import { keepsakeFor } from '../src/art/keepsakes'
import { NPCS_VERSION, NPC_DATA, npcDataById, type Challenge, type Npc } from '../src/data/game'
import type { GameDoc } from '../src/data/personal/game-schema'
import type { Encounter } from '../src/data/personal-schema'
import type { RegionData, Report, Site } from '../src/data/published-schema'
import {
  HOME_SPACING_KM, NPC_MAP_MAX, SOLVED_KEY, answerToStore, assignHomes, challengeSeed, checkAnswer, choicesFor, connectionsUnlocked, homeOutingDates,
  homesByNpc, keepsakesEarned, meetHint, meetings, npcsOnMap, roundFor, stage, stages,
} from '../src/domain/folk'

const dexNpc = (id: string) => npcDataById(id)!

describe('NPC data (P12)', () => {
  it('loads twelve NPCs that match the art cast and have keepsake icons', () => {
    expect(NPCS_VERSION).toBe('npcs-v1')
    expect(NPC_DATA.map((n) => n.id)).toEqual(NPCS.map((n) => n.id))
    for (const n of NPC_DATA) {
      expect(n.name).toBe(NPCS.find((x) => x.id === n.id)!.name)
      expect(keepsakeFor(n.id), n.id).toBeTruthy()
    }
  })
  it('keeps connections two-way where the story says so, and uses all six skills and six challenge kinds', () => {
    expect(dexNpc('nell').connections).toContain('dev')
    expect(dexNpc('dev').connections).toContain('nell')
    expect(new Set(NPC_DATA.map((n) => n.skill)).size).toBe(6)
    expect(new Set(NPC_DATA.map((n) => n.challenge.kind)).size).toBe(6)
  })
})

// ---------- homes ----------
let sid = 0
const rep = (speciesId: string | null, over: Partial<Report> = {}): Report => {
  sid += 1
  return { speciesId, ebirdCode: `c${sid}`, name: speciesId ?? 'x', sciName: `Fakeus s${sid}`, obsDate: '2026-11-06', obsTime: null, count: null, checklistUrl: null, reviewed: true, ...over }
}
/** Species ids that belong to the woodland set in the Starter Dex, found from the data so the test cannot drift from it. */
import { STARTER_DEX } from '../src/data/catalogue'
const inSet = (set: string, n: number) => STARTER_DEX.filter((s) => s.sets.includes(set as never)).slice(0, n).map((s) => s.id)
const mkSite = (id: string, point: [number, number], birds: string[]): Site => ({ id, name: id, point, url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports: birds.map((b) => rep(b)) })
const mkRegion = (sites: Site[], regionId = 'r1'): RegionData => ({
  schema: 1, regionId, generatedAt: '2026-11-08T06:00:00Z', isDemo: false, windowDays: 14,
  coverage: { hotspotsListed: 0, hotspotsActive: 0, reportsFetchedFor: 0, truncated: false, note: '' },
  sites, drive: { computedAt: null, byStart: {} }, unmatchedSpecies: [],
})
const wood = (n: number) => inSet('woodland', n)
const water = (n: number) => inSet('wetland', n)

describe('assignHomes', () => {
  const nell = dexNpc('nell') // woodland or garden
  const otis = dexNpc('otis') // wetland
  it('picks the matching site with the most Dex species, skips warden sites, and is repeatable', () => {
    const big = mkSite('big', [-2.3, 53.4], wood(12))
    const small = mkSite('small', [-2.1, 53.5], wood(6))
    const warden = mkSite('warden', [-2.0, 53.6], wood(14))
    const region = mkRegion([big, small, warden, mkSite('pond', [-1.9, 53.7], water(10))])
    const homes = assignHomes(region, [nell, otis], [{ siteId: 'warden' }])
    expect(homes.nell).toBe('big')
    expect(homes.otis).toBe('pond')
    expect(assignHomes(region, [nell, otis], [{ siteId: 'warden' }])).toEqual(homes)
  })
  it('keeps clear of another NPC’s home by 2 km, and gives no home when nothing matches', () => {
    const a = mkSite('a', [-2.3, 53.4], wood(12))
    const near = mkSite('near', [-2.3, 53.405], wood(11)) // about 0.55 km from a
    const far = mkSite('far', [-2.0, 53.4], wood(5))
    const region = mkRegion([a, near, far])
    const homes = assignHomes(region, [nell, dexNpc('kit')], [])
    expect(homes.nell).toBe('a')
    expect(homes.kit).toBe('far')
    const spacing = HOME_SPACING_KM
    expect(spacing).toBe(2)
    expect(assignHomes(mkRegion([mkSite('only', [-2.3, 53.4], wood(5))]), [dexNpc('leanne')], [])).toEqual({}) // coast: nothing fits
  })
  it('never moves an existing home, but re-picks one that has left the data', () => {
    const a = mkSite('a', [-2.3, 53.4], wood(12))
    const b = mkSite('b', [-2.0, 53.4], wood(5))
    const region = mkRegion([a, b])
    expect(assignHomes(region, [nell], [], { nell: 'b' }).nell).toBe('b')
    expect(assignHomes(region, [nell], [], { nell: 'gone' }).nell).toBe('a')
  })
  it('breaks ties with a seeded draw that does not depend on the order of the sites', () => {
    const sites = ['t1', 't2', 't3', 't4'].map((id, i) => mkSite(id, [-2.3 + i * 0.1, 53.4], wood(8)))
    const one = assignHomes(mkRegion(sites), [nell], [])
    const two = assignHomes(mkRegion([...sites].reverse()), [nell], [])
    expect(one).toEqual(two)
    const picks = new Set(['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((r) => assignHomes(mkRegion(sites, r), [nell], []).nell))
    expect(picks.size).toBeGreaterThan(1)
  })
})

// ---------- meetings and stages ----------
let n = 0
function enc(over: Partial<Encounter> = {}): Encounter {
  n += 1
  return { id: `enc${String(n).padStart(6, '0')}`, speciesId: 'european-robin', date: '2026-11-09', place: 'Wood', mode: 'seen', notes: '', photo: null, createdAt: '2026-11-09T12:00:00.000Z', siteId: 'L100001', time: '10:00', ...over }
}
const homes = { nell: ['L100001'], kit: ['L100001'], ruth: ['L100001'], leanne: ['L100002'] }
const cast = ['nell', 'kit', 'ruth', 'leanne'].map(dexNpc)

describe('meetings', () => {
  it('meets NPCs at the first real outing at their home, respecting the band; several on one outing', () => {
    const m = meetings(cast, homes, [enc({ time: '06:30' })])
    expect(m.map((x) => x.npcId).sort()).toEqual(['kit', 'nell']) // nell (dawn) and kit (any time); ruth needs dusk
    expect(m[0]).toMatchObject({ date: '2026-11-09', place: 'Wood' })
    expect(m[0].outingKey).toBe('2026-11-09|L100001')
  })
  it('waits for a sighting in the band: a later outing meets Ruth, and the first outing that fits is the one that counts', () => {
    const e = [enc({ time: '10:00' }), enc({ date: '2026-11-12', time: '18:15' }), enc({ date: '2026-11-14', time: '19:00' })]
    const ruth = meetings(cast, homes, e).find((x) => x.npcId === 'ruth')!
    expect(ruth.date).toBe('2026-11-12')
    expect(meetings(cast, homes, [enc({ time: null })]).map((x) => x.npcId)).toEqual(['kit']) // no time, no band
  })
  it('ignores sample outings, other sites and undated sightings', () => {
    expect(meetings(cast, homes, [enc({ source: 'sample' }), enc({ siteId: 'L100009' }), enc({ date: null }), enc({ siteId: null })])).toEqual([])
    expect(meetings(cast, homes, [enc({ source: 'ebird' })]).length).toBeGreaterThan(0)
  })
  it('reads homes from every region in the stored documents', () => {
    const docs: GameDoc[] = [{ id: 'npcHomes:r1', homes: { nell: 'L100001' } }, { id: 'npcHomes:r2', homes: { nell: 'L100003', kit: 'k2' } }, { id: 'note:x', text: 'hi' }]
    expect(homesByNpc(docs)).toEqual({ nell: ['L100001', 'L100003'], kit: ['k2'] })
    expect(meetings(cast, homesByNpc(docs), [enc({ siteId: 'L100003', time: '06:00' })]).map((x) => x.npcId)).toEqual(['nell'])
  })
})

describe('stage, keepsakes and connections', () => {
  const met = meetings(cast, homes, [enc({ time: '06:30' })])
  it('goes unmet, met, done, returned, and never skips ahead without a meeting', () => {
    expect(stage('ruth', met, undefined, [])).toBe('unmet')
    expect(stage('nell', met, undefined, [])).toBe('met')
    expect(stage('nell', met, { [SOLVED_KEY]: '2026-11-09' }, ['2026-11-09'])).toBe('done') // same day is not a return
    expect(stage('nell', met, { [SOLVED_KEY]: '2026-11-09' }, ['2026-11-09', '2026-11-16'])).toBe('returned')
    expect(stage('ruth', [], { [SOLVED_KEY]: '2026-11-09' }, ['2026-11-20'])).toBe('unmet')
    expect(stage('nell', met, { [SOLVED_KEY]: 'yesterday' }, ['2026-11-20'])).toBe('met')
  })
  it('works out every stage from sightings and saved answers, and finds home outing dates', () => {
    const e = [enc({ time: '06:30' }), enc({ date: '2026-11-16', time: '12:00' }), enc({ source: 'sample', date: '2026-11-30' })]
    expect(homeOutingDates('nell', homes, e)).toEqual(['2026-11-09', '2026-11-16'])
    const docs: GameDoc[] = [{ id: 'npc:nell', choices: { [SOLVED_KEY]: '2026-11-09' } }]
    expect(choicesFor(docs, 'nell')).toEqual({ [SOLVED_KEY]: '2026-11-09' })
    expect(stages(cast, homes, e, docs)).toEqual({ nell: 'returned', kit: 'met', ruth: 'unmet', leanne: 'unmet' })
  })
  it('gives keepsakes from done onwards, and unlocks a connection only when both are done', () => {
    const all = { nell: 'done', dev: 'met', kit: 'returned', bea: 'unmet' } as const
    expect(keepsakesEarned(NPC_DATA, { ...all })).toEqual(['nell', 'kit'])
    expect(connectionsUnlocked(NPC_DATA, { ...all })).toEqual([])
    expect(connectionsUnlocked(NPC_DATA, { ...all, dev: 'done' })).toEqual([['dev', 'nell']])
    expect(connectionsUnlocked(NPC_DATA, { ...all, dev: 'done', bea: 'returned' })).toEqual([['bea', 'dev'], ['dev', 'nell']])
  })
})

describe('npcsOnMap', () => {
  const sites = [0, 1, 2, 3, 4].map((i) => mkSite(`s${i}`, [-2.3 + i * 0.01, 53.4], wood(2)))
  const homesHere = { nell: 's0', kit: 's1', imani: 's2', moss: 's3', june: 's4' }
  const base = { homes: homesHere, sites, met: new Set(['kit']), zoom: 14, selectedSiteId: 's4', order: NPC_DATA.map((x) => x.id) }
  it('shows nothing below zoom 13', () => {
    expect(npcsOnMap({ ...base, zoom: 12.9 })).toEqual([])
    expect(npcsOnMap({ ...base, zoom: 13 }).length).toBe(NPC_MAP_MAX)
  })
  it('shows at most three, nearest the selected site first, and says who is met', () => {
    const on = npcsOnMap(base)
    expect(on.map((x) => x.npcId)).toEqual(['june', 'moss', 'imani'])
    expect(npcsOnMap({ ...base, selectedSiteId: 's0' }).map((x) => [x.npcId, x.met])).toEqual([['nell', false], ['kit', true], ['imani', false]])
  })
  it('keeps to the visible box, skips homes missing from the data, and falls back to the box centre', () => {
    expect(npcsOnMap({ ...base, selectedSiteId: null, bounds: [-2.31, 53.3, -2.28, 53.5] }).map((x) => x.npcId)).toEqual(['nell', 'kit', 'imani'])
    expect(npcsOnMap({ ...base, homes: { nell: 'gone', kit: 's1' } }).map((x) => x.npcId)).toEqual(['kit'])
  })
  it('hints at how to meet someone', () => {
    expect(meetHint(dexNpc('nell'), 'Rainham Marshes')).toBe('Nell is usually at Rainham Marshes at dawn. Visit, then add the trip to your Journal to meet them.')
    expect(meetHint(dexNpc('kit'), 'Crossness')).toContain('Kit is usually at Crossness')
    expect(meetHint(dexNpc('kit'))).toBe('Kit lives near the places you bird. Visit and add the trip to your Journal to meet them.')
  })
})

describe('challenges', () => {
  const kinds = (k: Challenge['kind']) => NPC_DATA.filter((x: Npc) => x.challenge.kind === k).map((x) => x.challenge)
  it('the same seed gives the same round, and a different attempt can differ', () => {
    for (const c of NPC_DATA.map((x) => x.challenge)) expect(roundFor(c, 'a:1')).toEqual(roundFor(c, 'a:1'))
    const nell = dexDataChallenge('nell')
    const answers = new Set(Array.from({ length: 30 }, (_, i) => (roundFor(nell, challengeSeed('nell', i)) as { answerIndex: number }).answerIndex))
    expect(answers.size).toBe(3) // the right answer moves around
  })
  it('pick-phrase, pick-by-pose and match-swatch: right index only', () => {
    for (const c of [...kinds('pick-phrase'), ...kinds('pick-by-pose'), ...kinds('match-swatch')]) {
      const r = roundFor(c, 's1') as { options: string[]; answerIndex: number }
      expect(new Set(r.options).size).toBe(r.options.length)
      expect(checkAnswer(c, 's1', r.answerIndex)).toBe(true)
      for (let i = 0; i < r.options.length; i++) if (i !== r.answerIndex) expect(checkAnswer(c, 's1', i)).toBe(false)
      expect(checkAnswer(c, 's1', String(r.answerIndex))).toBe(false)
    }
  })
  it('count-flock is exact, inside the range, and varies with the seed', () => {
    const c = kinds('count-flock')[0] as Extract<Challenge, { kind: 'count-flock' }>
    const counts = Array.from({ length: 40 }, (_, i) => (roundFor(c, `j:${i}`) as { count: number }).count)
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(c.min)
    expect(Math.max(...counts)).toBeLessThanOrEqual(c.max)
    expect(new Set(counts).size).toBeGreaterThan(3)
    expect(checkAnswer(c, 'j:0', counts[0])).toBe(true)
    expect(checkAnswer(c, 'j:0', counts[0] + 1)).toBe(false)
    expect(checkAnswer(c, 'j:0', counts[0] - 1)).toBe(false)
  })
  it('spot needs the target cell', () => {
    for (const c of kinds('spot') as Extract<Challenge, { kind: 'spot' }>[]) {
      const r = roundFor(c, 'k:1') as { target: number; cells: number }
      expect(r.target).toBeGreaterThanOrEqual(0)
      expect(r.target).toBeLessThan(r.cells)
      expect(checkAnswer(c, 'k:1', r.target)).toBe(true)
      expect(checkAnswer(c, 'k:1', (r.target + 1) % r.cells)).toBe(false)
    }
  })
  it('choice accepts any listed option and nothing else', () => {
    const c = dexDataChallenge('ruth')
    expect(checkAnswer(c, 'r:1', 'stay')).toBe(true)
    expect(checkAnswer(c, 'r:1', 'home')).toBe(true)
    expect(checkAnswer(c, 'r:1', 'nope')).toBe(false)
    expect(checkAnswer(c, 'r:1', 0)).toBe(false)
  })
  it('stores nothing for a wrong answer, the date for a right one, and the option for a choice', () => {
    const nell = dexDataChallenge('nell')
    const r = roundFor(nell, 'n:1') as { answerIndex: number }
    expect(answerToStore(nell, 'n:1', (r.answerIndex + 1) % 3, '2026-11-09')).toEqual({})
    expect(answerToStore(nell, 'n:1', r.answerIndex, '2026-11-09')).toEqual({ solved: '2026-11-09' })
    expect(answerToStore(dexDataChallenge('ruth'), 'r:1', 'stay', '2026-11-09')).toEqual({ solved: '2026-11-09', choice: 'stay' })
  })
})

function dexDataChallenge(id: string): Challenge {
  return npcDataById(id)!.challenge
}
