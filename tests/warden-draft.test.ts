// Synthetic fixtures only. Checks the warden drafting rules from AUTOPILOT D2.
import { describe, expect, it } from 'vitest'
import { STARTER_DEX } from '../src/data/catalogue'
import { draftWardens, SIGNATURE_SIZE } from '../pipeline/wardens'
import type { RegionData, Report, Site } from '../src/data/published-schema'
import { siteCharacter } from '../src/domain/siteCharacter'

const rep = (speciesId: string): Report => ({
  speciesId, ebirdCode: `x${speciesId}`, name: speciesId, sciName: 'Fakeus fakeus', obsDate: '2026-11-01', obsTime: null, count: null, checklistUrl: null, reviewed: false,
})
const inSet = (set: string) => STARTER_DEX.filter((s) => s.sets[0] === set).map((s) => s.id)
const site = (id: string, species: string[], point: [number, number] = [-2.3, 53.4]): Site => ({
  id, name: `Site ${id}`, point, url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports: species.map(rep),
})
const region = (sites: Site[], minutes: Record<string, number | null> = {}): RegionData => ({
  schema: 1, regionId: 'rr', generatedAt: '2026-11-07T06:00:00Z', isDemo: true, windowDays: 14,
  coverage: { hotspotsListed: 0, hotspotsActive: 0, reportsFetchedFor: 0, truncated: false, note: '' },
  sites,
  drive: { computedAt: null, byStart: { s: Object.fromEntries(sites.map((x) => [x.id, minutes[x.id] === null ? { status: 'unknown' as const } : { status: 'ok' as const, s: (minutes[x.id] ?? 20) * 60, m: minutes[x.id] ?? 20 }])) } },
  unmatchedSpecies: [],
})

const wet = inSet('wetland')
const wood = inSet('woodland')
const gard = inSet('garden')

describe('draftWardens', () => {
  it('needs 12 Dex species and a known drive of 90 minutes or less', () => {
    const r = region([site('few', wet.slice(0, 11)), site('far', wet.slice(0, 14), [-2.0, 53.4]), site('unk', wet.slice(0, 14), [-1.8, 53.4]), site('ok', wet.slice(0, 12), [-1.6, 53.4])], { far: 91, unk: null })
    expect(draftWardens(r).map((w) => w.siteId)).toEqual(['ok'])
  })

  it('picks the richest site for each habitat, one persona each, ids tied to the region', () => {
    const w1 = site('w1', wet.slice(0, 13), [-2.3, 53.4])
    const w2 = site('w2', wet.slice(0, 12), [-2.0, 53.4])
    const f1 = site('f1', wood.slice(0, 13), [-1.7, 53.4])
    const g1 = site('g1', gard.slice(0, 12), [-1.4, 53.4])
    const out = draftWardens(region([w1, w2, f1, g1]))
    expect(siteCharacter(w1)[0]).toBe('wetland')
    expect(out[0].siteId).toBe('w1')
    expect(new Set(out.map((w) => w.persona)).size).toBe(out.length)
    expect(out.every((w) => w.id === `${w.persona}-rr`)).toBe(true)
    expect(out.map((w) => w.siteId).sort()).toEqual(['f1', 'g1', 'w1', 'w2'])
  })

  it('skips a site within 2 km of one already chosen', () => {
    const a = site('a', wet.slice(0, 14), [-2.3, 53.4])
    const b = site('b', wet.slice(0, 13), [-2.3, 53.405]) // about 0.5 km away
    expect(draftWardens(region([a, b])).map((w) => w.siteId)).toEqual(['a'])
  })

  it('builds the signature from the rarest birds, with the boss the rarest in the region', () => {
    const common = wet.slice(0, 12)
    const a = site('a', common)
    // Every other site reports the first ten, so the last two are the rarest at site a.
    const others = Array.from({ length: 4 }, (_, i) => site(`o${i}`, common.slice(0, 10), [-1 - i, 53.4]))
    const w = draftWardens(region([a, ...others])).find((x) => x.siteId === 'a')!
    expect(w.signature).toHaveLength(Math.min(SIGNATURE_SIZE, 12))
    expect(w.signature.slice(0, 2).sort()).toEqual(common.slice(10).sort())
    expect(common.slice(10)).toContain(w.boss)
    expect(w.signature).toContain(w.boss)
  })

  it('is deterministic and keeps no observer or raw data', () => {
    const r = region([site('a', wet.slice(0, 14)), site('b', wood.slice(0, 14), [-1.5, 53.4])])
    expect(draftWardens(r)).toEqual(draftWardens(r))
    expect(JSON.stringify(draftWardens(r))).not.toMatch(/observer|userDisplayName/i)
  })

  it('gives a raptor-boss site a raptor watcher and an owl-boss site the owl persona', () => {
    const owl = STARTER_DEX.find((s) => s.sciName.startsWith('Tyto'))!.id
    const kestrel = STARTER_DEX.find((s) => s.sciName.startsWith('Falco tinnunculus'))!.id
    const filler = inSet('farmland-upland').filter((id) => id !== owl && id !== kestrel)
    const o = site('owl', [owl, ...filler.slice(0, 12)], [-2.3, 53.4])
    const k = site('kes', [kestrel, ...filler.slice(0, 12)], [-1.5, 53.4])
    // Make the owl and kestrel the rarest in the region: filler birds are reported by extra sites.
    const pad = Array.from({ length: 3 }, (_, i) => site(`p${i}`, filler.slice(0, 12), [-0.5 - i, 53.4]))
    const out = draftWardens(region([o, k, ...pad]))
    expect(out.find((w) => w.siteId === 'owl')).toMatchObject({ habitat: 'night', persona: 'olu', boss: owl })
    expect(out.find((w) => w.siteId === 'kes')).toMatchObject({ habitat: 'raptors', persona: 'fergus', boss: kestrel })
  })
})
