import { describe, expect, it } from 'vitest'
import { PERSONAS } from '../src/data/personas'
import { VOICE_BRANCHES, WARDEN_VOICES_VERSION, allWardens, voiceFor, type Warden } from '../src/data/game'
import type { RegionData, Report, Site } from '../src/data/published-schema'
import { weekKey, wardenNote } from '../src/domain/wardenNote'

const rep = (speciesId: string | null, name: string, over: Partial<Report> = {}): Report => ({
  speciesId, ebirdCode: `c${name.replace(/\W/g, '').toLowerCase()}`, name, sciName: `Fakeus ${name.replace(/\W/g, '').toLowerCase()}`,
  obsDate: '2026-11-06', obsTime: '07:30', count: null, checklistUrl: null, reviewed: true, ...over,
})
const mkSite = (id: string, reports: Report[], name = 'Reedbed Marsh Nature Reserve'): Site => ({ id, name, point: [-2.3, 53.4], url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports })
const mkRegion = (sites: Site[], over: Partial<RegionData> = {}): RegionData => ({
  schema: 1, regionId: 'r', generatedAt: '2026-11-08T06:00:00Z', isDemo: false, windowDays: 14,
  coverage: { hotspotsListed: 0, hotspotsActive: 0, reportsFetchedFor: 0, truncated: false, note: '' },
  sites, drive: { computedAt: null, byStart: {} }, unmatchedSpecies: [], ...over,
})
const warden: Warden = { id: 'maud-r', persona: 'maud', siteId: 'L1', siteName: 'Reedbed Marsh', habitat: 'wetland', signature: ['mute-swan', 'gadwall', 'eurasian-teal'], boss: 'mute-swan' }
/** Filler sites so that the share of sites reporting a bird can be small. */
const fillers = (n: number): Site[] => Array.from({ length: n }, (_, i) => mkSite(`F${i}`, [rep('common', 'Commonbird', { sciName: 'Fakeus common' })]))
const bit = (...d: number[]) => d.reduce((m, x) => m | (1 << x), 0)
const slotLeft = /[{}]/

describe('weekKey', () => {
  it('is the ISO week, with Monday as the first day', () => {
    expect(weekKey(new Date(2026, 10, 8))).toBe('2026-W45') // Sunday 8 Nov 2026
    expect(weekKey(new Date(2026, 10, 9))).toBe('2026-W46') // Monday
    expect(weekKey(new Date(2026, 0, 1))).toBe('2026-W01') // Thursday 1 Jan 2026
    expect(weekKey(new Date(2021, 0, 3))).toBe('2020-W53') // belongs to the old year
  })
})

describe('warden voices data', () => {
  it('covers every persona with every branch', () => {
    expect(WARDEN_VOICES_VERSION).toMatch(/voices/)
    for (const p of PERSONAS) {
      const v = voiceFor(p.id)!
      expect(v, p.id).toBeTruthy()
      for (const b of VOICE_BRANCHES) expect(v[b].length, `${p.id}/${b}`).toBeGreaterThanOrEqual(1)
      expect(VOICE_BRANCHES.reduce((n, b) => n + v[b].length, 0)).toBeLessThanOrEqual(8)
    }
  })
})

describe('wardenNote', () => {
  it('prefers a rare bird, with its best time of day when known', () => {
    const site = mkSite('L1', [rep(null, 'Pectoral Sandpiper', { notable: true, bands: { dawn: 5, day: 1, dusk: 0, night: 0 } }), rep('mute-swan', 'Mute Swan', { days: bit(0, 1, 2) })])
    const n = wardenNote(warden, site, mkRegion([site, ...fillers(5)]), '2026-W45')!
    expect(n.kind).toBe('rare')
    expect(n.text).toContain('Pectoral Sandpiper')
    expect(n.text).toContain('at dawn')
    expect(n.text).not.toMatch(slotLeft)
    expect(n.basis).toMatch(/^eBird reports, last 14 days/)
    expect(n.birdCode).toBe('cpectoralsandpiper')
  })

  it('uses the plain rare line when there is no clear time of day, and says so when unconfirmed', () => {
    const site = mkSite('L1', [rep(null, 'Pectoral Sandpiper', { notable: true, unconfirmed: true })])
    const n = wardenNote(warden, site, mkRegion([site]), '2026-W45')!
    expect(n.kind).toBe('rare')
    expect(n.text).toContain('Pectoral Sandpiper')
    expect(n.text).not.toContain('at dawn')
    expect(n.text).toMatch(/waiting for eBird to review/)
  })

  it('treats a scarce bird (under 3% of sites) as rare', () => {
    const site = mkSite('L1', [rep('gadwall', 'Gadwall', { sciName: 'Fakeus scarcish' })])
    const note = wardenNote(warden, site, mkRegion([site, ...fillers(60)]), '2026-W45')!
    expect(note.kind).toBe('rare')
    expect(note.text).toContain('Gadwall')
  })

  it('else picks the signature bird reported on the most days, using the real number', () => {
    const site = mkSite('L1', [rep('mute-swan', 'Mute Swan', { days: bit(0, 1, 2), sciName: 'Fakeus common' }), rep('gadwall', 'Gadwall', { days: bit(0, 1, 2, 3, 4, 5, 6), sciName: 'Fakeus common' })])
    const n = wardenNote(warden, site, mkRegion([site, ...fillers(5)]), '2026-W45')!
    expect(n.kind).toBe('reliable')
    expect(n.text).toContain('Gadwall')
    expect(n.text).toMatch(/\b7\b/)
    expect(n.text).toMatch(/\b14\b/)
    expect(n.text).not.toMatch(slotLeft)
  })

  it('ties go to the earlier bird on the signature list', () => {
    const site = mkSite('L1', [rep('gadwall', 'Gadwall', { days: bit(0, 1), sciName: 'Fakeus common' }), rep('mute-swan', 'Mute Swan', { days: bit(2, 3), sciName: 'Fakeus common' })])
    expect(wardenNote(warden, site, mkRegion([site, ...fillers(5)]), '2026-W45')!.birdCode).toBe('cmuteswan')
  })

  it('says "since" while the history is still filling up, and not once it is full', () => {
    const site = mkSite('L1', [rep('gadwall', 'Gadwall', { days: bit(0, 1), sciName: 'Fakeus common' })])
    const filling = wardenNote(warden, site, mkRegion([site, ...fillers(5)], { historySince: '2026-11-05' }), '2026-W45')!
    expect(filling.basis).toBe('eBird reports, last 14 days, days counted since 5 Nov')
    const full = wardenNote(warden, site, mkRegion([site, ...fillers(5)], { historySince: '2026-10-01' }), '2026-W45')!
    expect(full.basis).toBe('eBird reports, last 14 days')
  })

  it('without any history, names a reported signature bird and gives no day count', () => {
    const site = mkSite('L1', [rep('gadwall', 'Gadwall', { sciName: 'Fakeus common', days: undefined })])
    const n = wardenNote(warden, site, mkRegion([site, ...fillers(5)]), '2026-W45')!
    expect(n.kind).toBe('seen')
    expect(n.text).toContain('Gadwall')
    expect(n.text).not.toMatch(/\d/)
    expect(n.basis).toBe('eBird reports, last 14 days')
  })

  it('has a quiet-week line when nothing relevant was reported, or the site has left the data', () => {
    const site = mkSite('L1', [rep('european-robin', 'Robin', { sciName: 'Fakeus common' })])
    const quiet = wardenNote(warden, site, mkRegion([site, ...fillers(5)]), '2026-W45')!
    expect(quiet.kind).toBe('quiet')
    expect(quiet.text).toContain('Reedbed Marsh')
    expect(quiet.birdCode).toBeNull()
    const gone = wardenNote(warden, null, mkRegion(fillers(5)), '2026-W45')!
    expect(gone.kind).toBe('quiet')
    expect(gone.text).toContain('Reedbed Marsh')
  })

  it('is the same all week and can change next week', () => {
    const site = mkSite('L1', [rep('gadwall', 'Gadwall', { days: bit(0, 1, 2), sciName: 'Fakeus common' })])
    const region = mkRegion([site, ...fillers(5)])
    const a = wardenNote(warden, site, region, '2026-W45')
    expect(wardenNote(warden, site, region, '2026-W45')).toEqual(a)
    const texts = new Set(Array.from({ length: 20 }, (_, i) => wardenNote(warden, site, region, `2026-W${String(i + 20).padStart(2, '0')}`)!.text))
    expect(texts.size).toBeGreaterThan(1)
  })

  it('fills every slot for every persona and every branch', () => {
    for (const w of allWardens()) {
      const reliable = mkSite(w.siteId, [rep(w.signature[0], 'Alpha', { days: bit(0, 3), sciName: 'Fakeus common' })])
      const rare = mkSite(w.siteId, [rep(null, 'Zeta', { notable: true, bands: { dawn: 0, day: 0, dusk: 4, night: 0 } })])
      const rareNoBand = mkSite(w.siteId, [rep(null, 'Zeta', { notable: true })])
      const seen = mkSite(w.siteId, [rep(w.signature[0], 'Alpha', { sciName: 'Fakeus common' })])
      const quiet = mkSite(w.siteId, [])
      for (const site of [reliable, rare, rareNoBand, seen, quiet]) {
        for (const wk of ['2026-W44', '2026-W45', '2026-W46', '2026-W47']) {
          const n = wardenNote(w, site, mkRegion([site, ...fillers(5)]), wk)!
          expect(n.text, `${w.id} ${n.kind}`).not.toMatch(slotLeft)
          expect(n.text.length).toBeGreaterThan(20)
        }
      }
    }
  })
})
