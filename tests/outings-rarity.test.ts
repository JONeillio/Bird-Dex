import { describe, expect, it } from 'vitest'
import type { Encounter } from '../src/data/personal-schema'
import type { RegionData, Report, Site } from '../src/data/published-schema'
import { groupOutings, outingKey, outingsSince } from '../src/domain/outings'
import { binomialOf, buildRarity, RARITY_POINTS, rarityOf, sciNameFor, tierForShare } from '../src/domain/rarity'

let n = 0
function enc(over: Partial<Encounter> = {}): Encounter {
  n += 1
  return {
    id: `enc${String(n).padStart(6, '0')}`, speciesId: 'european-robin', date: '2026-10-01', place: 'Pennington Flash', mode: 'seen',
    notes: '', photo: null, createdAt: `2026-11-08T10:00:${String(n % 60).padStart(2, '0')}.000Z`, ...over,
  }
}

describe('outings (N1)', () => {
  it('groups by date and place, newest date first, undated left out', () => {
    const outs = groupOutings([
      enc({ date: '2026-10-01' }),
      enc({ date: '2026-10-01', speciesId: 'blue-tit' }),
      enc({ date: '2026-10-01', place: 'Sale Water Park' }),
      enc({ date: '2026-10-05' }),
      enc({ date: null }),
    ])
    // same date: the one added most recently comes first
    expect(outs.map((o) => o.key)).toEqual(['2026-10-05|pennington flash', '2026-10-01|sale water park', '2026-10-01|pennington flash'])
    expect(outs[0].date).toBe('2026-10-05')
    const pen = outs.find((o) => o.key === '2026-10-01|pennington flash')!
    expect(pen.species).toEqual(['european-robin', 'blue-tit'])
    expect(pen.encounters).toHaveLength(2)
    expect(pen.place).toBe('Pennington Flash')
  })

  it('uses the hotspot id as the place key when there is one, so labels can differ', () => {
    const outs = groupOutings([
      enc({ siteId: 'L123', place: 'Pennington Flash CP' }),
      enc({ siteId: 'L123', place: 'Pennington Flash', speciesId: 'blue-tit' }),
    ])
    expect(outs).toHaveLength(1)
    expect(outs[0].siteId).toBe('L123')
    expect(outs[0].key).toBe('2026-10-01|L123')
  })

  it('lists species in the order seen, by time', () => {
    const outs = groupOutings([enc({ speciesId: 'blue-tit', time: '09:00' }), enc({ speciesId: 'european-robin', time: '07:00' })])
    expect(outs[0].species).toEqual(['european-robin', 'blue-tit'])
  })

  it('flags an outing as sample only when every sighting is sample', () => {
    expect(groupOutings([enc({ source: 'sample' }), enc({ source: 'sample' })])[0].sample).toBe(true)
    expect(groupOutings([enc({ source: 'sample' }), enc({ source: 'log' })])[0].sample).toBe(false)
    expect(groupOutings([enc()])[0].sample).toBe(false)
  })

  it('outingKey is null without a date', () => {
    expect(outingKey({ date: null, siteId: null, place: 'x' })).toBeNull()
  })

  it('outingsSince returns only outings with something added after the marker', () => {
    const old = enc({ date: '2026-09-01', createdAt: '2026-11-01T00:00:00.000Z' })
    const added = enc({ date: '2026-10-02', createdAt: '2026-11-08T12:00:00.000Z' })
    const sameDayAddedLater = enc({ date: '2026-09-01', speciesId: 'blue-tit', createdAt: '2026-11-08T13:00:00.000Z' })
    expect(outingsSince([old, added], null)).toHaveLength(2)
    expect(outingsSince([old, added], '2026-11-02T00:00:00.000Z').map((o) => o.date)).toEqual(['2026-10-02'])
    // re-importing a newer export adds to an old outing: that outing shows up again
    expect(outingsSince([old, added, sameDayAddedLater], '2026-11-08T12:30:00.000Z').map((o) => o.date)).toEqual(['2026-09-01'])
    expect(outingsSince([old], '2026-11-08T00:00:00.000Z')).toEqual([])
  })
})

const rep = (sciName: string, over: Partial<Report> = {}): Report => ({
  speciesId: null, ebirdCode: 'x', name: sciName, sciName, obsDate: '2026-11-06', obsTime: null, count: null, checklistUrl: null, reviewed: false, ...over,
})
const site = (id: string, reports: Report[]): Site => ({
  id, name: id, point: [-2.3, 53.4], url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports,
})
const region = (sites: Site[]): RegionData => ({
  schema: 1, regionId: 'r', generatedAt: '2026-11-07T06:00:00Z', isDemo: true, windowDays: 14,
  coverage: { hotspotsListed: 0, hotspotsActive: 0, reportsFetchedFor: 0, truncated: false, note: '' },
  sites, drive: { computedAt: null, byStart: {} }, unmatchedSpecies: [],
})

describe('rarity (N1)', () => {
  it('tiers sit on the share boundaries', () => {
    expect(tierForShare(0.029)).toBe('scarce')
    expect(tierForShare(0.03)).toBe('uncommon')
    expect(tierForShare(0.099)).toBe('uncommon')
    expect(tierForShare(0.1)).toBe('fairly-common')
    expect(tierForShare(0.249)).toBe('fairly-common')
    expect(tierForShare(0.25)).toBe('common')
    expect(RARITY_POINTS).toMatchObject({ rare: 25, scarce: 10, uncommon: 5, 'fairly-common': 2, common: 1, unreported: 8, unknown: 1 })
  })

  it('computes shares across counted sites only (sites with no reports are ignored)', () => {
    const sites: Site[] = []
    // 100 sites with reports; one species at 2 of them (2%), 5 (5%), 20 (20%), 50 (50%)
    for (let i = 0; i < 100; i++) {
      const reports = [rep('Common commonus')]
      if (i < 50) reports.push(rep('Half halfus'))
      if (i < 20) reports.push(rep('Fifth fifthus'))
      if (i < 5) reports.push(rep('Few fewus'))
      if (i < 2) reports.push(rep('Rare rarus'))
      sites.push(site(`L${i + 1}`, reports))
    }
    sites.push(site('L999', [])) // not counted
    const t = buildRarity(region(sites))
    expect(t.countedSites).toBe(100)
    expect(rarityOf(t, 'Common commonus').tier).toBe('common')
    expect(rarityOf(t, 'Half halfus').tier).toBe('common')
    expect(rarityOf(t, 'Fifth fifthus').tier).toBe('fairly-common')
    expect(rarityOf(t, 'Few fewus').tier).toBe('uncommon')
    expect(rarityOf(t, 'Rare rarus').tier).toBe('scarce')
    expect(rarityOf(t, 'Rare rarus').share).toBeCloseTo(0.02)
  })

  it('a confirmed notable report is rare; an unconfirmed one does not make it rare', () => {
    const t = buildRarity(region([
      site('L1', [rep('Notable notus', { notable: true }), rep('Maybe mayus', { notable: true, unconfirmed: true }), rep('Plain plainus')]),
      site('L2', [rep('Plain plainus')]),
    ]))
    expect(rarityOf(t, 'Notable notus')).toMatchObject({ tier: 'rare', points: 25 })
    expect(rarityOf(t, 'Maybe mayus').tier).not.toBe('rare')
  })

  it('any confirmed notable record at any site makes the species rare', () => {
    const t = buildRarity(region([
      site('L1', [rep('Notable notus')]),
      site('L2', [rep('Notable notus', { notable: true })]),
    ]))
    expect(rarityOf(t, 'Notable notus').tier).toBe('rare')
  })

  it('matches subspecies names by binomial, for Dex and outside-Dex birds', () => {
    expect(binomialOf('Branta bernicla bernicla')).toBe('Branta bernicla')
    const t = buildRarity(region([site('L1', [rep('Branta bernicla')])]))
    expect(rarityOf(t, 'Branta bernicla hrota').tier).toBe('common')
    expect(sciNameFor('european-robin')).toBe('Erithacus rubecula')
    expect(sciNameFor('x-regulus-ignicapilla', 'Regulus ignicapilla')).toBe('Regulus ignicapilla')
    expect(sciNameFor('x-unknown')).toBeNull()
  })

  it('a bird not in the table is unreported (8)', () => {
    const t = buildRarity(region([site('L1', [rep('Some somus')])]))
    expect(rarityOf(t, 'Other otherus')).toMatchObject({ tier: 'unreported', points: 8, share: null })
    expect(rarityOf(t, null).tier).toBe('unreported')
  })

  it('with no region data every bird is unknown (1)', () => {
    for (const t of [buildRarity(null), buildRarity(region([])), buildRarity(region([site('L1', [])]))]) {
      expect(t.hasData).toBe(false)
      expect(rarityOf(t, 'Any anyus')).toMatchObject({ tier: 'unknown', points: 1 })
    }
  })
})
