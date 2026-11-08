import { describe, expect, it } from 'vitest'
import { STARTER_DEX } from '../src/data/catalogue'
import { JOB_KINDS, WARDEN_JOBS_VERSION, allWardens, jobTemplatesFor, type Warden } from '../src/data/game'
import type { Encounter } from '../src/data/personal-schema'
import { JOBS_PER_MONTH, TRUST_LEVELS, jobStatus, jobsFor, trust, trustLevel, type Job } from '../src/domain/wardenJobs'

let n = 0
function enc(over: Partial<Encounter> = {}): Encounter {
  n += 1
  return {
    id: `enc${String(n).padStart(6, '0')}`, speciesId: 'european-robin', date: '2026-05-10', place: 'Reedbed', mode: 'seen', notes: '', photo: null,
    createdAt: `2026-11-08T10:00:${String(n % 60).padStart(2, '0')}.000Z`, siteId: 'L100001', ...over,
  }
}
const dex = new Set(STARTER_DEX.map((s) => s.id))
const sig = ['mute-swan', 'gadwall', 'eurasian-teal', 'common-snipe', 'water-rail', 'eurasian-bittern', 'little-grebe', 'eurasian-coot'].filter((id) => dex.has(id))
const warden: Warden = { id: 'maud-location-1', persona: 'maud', siteId: 'L100001', siteName: 'Reedbed', habitat: 'wetland', signature: sig, boss: sig[0] }
const job = (over: Partial<Job>): Job => ({ id: 'x', kind: 'signature', month: '2026-05', text: 't', ...over })

describe('job templates (P9)', () => {
  it('load, with every habitat covered', () => {
    expect(WARDEN_JOBS_VERSION).toMatch(/warden-jobs/)
    for (const h of ['wetland', 'coast', 'woodland', 'farmland-upland', 'garden', 'raptors', 'night'] as const) {
      expect(jobTemplatesFor(h).length).toBeGreaterThanOrEqual(3)
    }
    expect(JOB_KINDS).toHaveLength(5)
  })
})

describe('jobsFor', () => {
  it('gives two jobs of different kinds, the same every time', () => {
    const a = jobsFor(warden, '2026-05')
    expect(a).toHaveLength(JOBS_PER_MONTH)
    expect(new Set(a.map((j) => j.kind)).size).toBe(2)
    expect(jobsFor(warden, '2026-05')).toEqual(a)
  })

  it('changes between months, and between wardens', () => {
    const months = Array.from({ length: 12 }, (_, i) => JSON.stringify(jobsFor(warden, `2026-${String(i + 1).padStart(2, '0')}`)))
    expect(new Set(months).size).toBeGreaterThan(4)
    const other = { ...warden, id: 'reg-location-1' }
    const same = months.filter((m, i) => m === JSON.stringify(jobsFor(other, `2026-${String(i + 1).padStart(2, '0')}`)))
    expect(same.length).toBeLessThan(12)
  })

  it('only names signature birds, with no slot left unfilled, for every real warden and month', () => {
    for (const w of allWardens()) {
      for (let m = 1; m <= 12; m++) {
        const jobs = jobsFor(w, `2026-${String(m).padStart(2, '0')}`)
        expect(jobs).toHaveLength(2)
        const birds = jobs.map((j) => j.speciesId).filter(Boolean) as string[]
        expect(new Set(birds).size).toBe(birds.length)
        for (const j of jobs) {
          expect(j.text).not.toMatch(/[{}]/)
          if (j.speciesId) expect(w.signature).toContain(j.speciesId)
          if (j.kind === 'signature') expect(j.n).toBeLessThanOrEqual(w.signature.length)
        }
      }
    }
  })

  it('returns nothing for a bad month', () => {
    expect(jobsFor(warden, '2026-13')).toEqual([])
    expect(jobsFor(warden, 'May')).toEqual([])
  })
})

describe('jobStatus', () => {
  it('count: needs the number in one sighting; X and unknown never count', () => {
    const j = job({ kind: 'count', speciesId: 'mute-swan', min: 5 })
    expect(jobStatus(warden, j, [enc({ speciesId: 'mute-swan', count: 4 })])).toMatchObject({ done: false, progress: 4, target: 5 })
    expect(jobStatus(warden, j, [enc({ speciesId: 'mute-swan', count: 6 })]).done).toBe(true)
    expect(jobStatus(warden, j, [enc({ speciesId: 'mute-swan', count: null }), enc({ speciesId: 'mute-swan' })]).done).toBe(false)
    expect(jobStatus(warden, j, [enc({ speciesId: 'gadwall', count: 9 })]).done).toBe(false)
  })

  it('heard: heard or both, and the band when asked', () => {
    const j = job({ kind: 'heard', speciesId: 'water-rail', band: 'dawn' })
    expect(jobStatus(warden, j, [enc({ speciesId: 'water-rail', mode: 'seen', time: '06:00' })]).done).toBe(false)
    expect(jobStatus(warden, j, [enc({ speciesId: 'water-rail', mode: 'heard', time: '13:00' })]).done).toBe(false)
    expect(jobStatus(warden, j, [enc({ speciesId: 'water-rail', mode: 'heard' })]).done).toBe(false)
    expect(jobStatus(warden, j, [enc({ speciesId: 'water-rail', mode: 'both', time: '06:30' })]).done).toBe(true)
    expect(jobStatus(warden, { ...j, band: undefined }, [enc({ speciesId: 'water-rail', mode: 'heard' })]).done).toBe(true)
  })

  it('band: different birds in that part of the day', () => {
    const j = job({ kind: 'band', band: 'dusk', n: 3 })
    const dusk = (s: string, time = '18:00') => enc({ speciesId: s, time })
    expect(jobStatus(warden, j, [dusk('mute-swan'), dusk('mute-swan'), dusk('gadwall'), enc({ speciesId: 'eurasian-teal', time: '07:00' })])).toMatchObject({ done: false, progress: 2 })
    expect(jobStatus(warden, j, [dusk('mute-swan'), dusk('gadwall'), dusk('eurasian-teal', '20:59')]).done).toBe(true)
  })

  it('signature: different signature birds this month, other birds ignored', () => {
    const j = job({ kind: 'signature', n: 2 })
    expect(jobStatus(warden, j, [enc({ speciesId: 'mute-swan' }), enc({ speciesId: 'european-robin' })]).done).toBe(false)
    expect(jobStatus(warden, j, [enc({ speciesId: 'mute-swan' }), enc({ speciesId: 'gadwall' })]).done).toBe(true)
  })

  it('only counts the job month', () => {
    const j = job({ kind: 'signature', n: 1 })
    expect(jobStatus(warden, j, [enc({ speciesId: 'mute-swan', date: '2026-04-30' }), enc({ speciesId: 'mute-swan', date: '2026-06-01' })]).done).toBe(false)
    expect(jobStatus(warden, j, [enc({ speciesId: 'mute-swan', date: '2026-05-31' })]).done).toBe(true)
  })

  it('ignores sample sightings, other sites, and undated sightings', () => {
    const j = job({ kind: 'signature', n: 1 })
    expect(jobStatus(warden, j, [enc({ speciesId: 'mute-swan', source: 'sample' })]).done).toBe(false)
    expect(jobStatus(warden, j, [enc({ speciesId: 'mute-swan', siteId: 'L999999' })]).done).toBe(false)
    expect(jobStatus(warden, j, [enc({ speciesId: 'mute-swan', siteId: null })]).done).toBe(false)
    expect(jobStatus(warden, j, [enc({ speciesId: 'mute-swan', date: null })]).done).toBe(false)
    expect(jobStatus(warden, j, [enc({ speciesId: 'mute-swan', source: 'ebird' })]).done).toBe(true)
  })

  it('season: a first visit in a season, not a repeat of one', () => {
    const j = job({ kind: 'season', month: '2026-05' })
    expect(jobStatus(warden, j, []).done).toBe(false)
    expect(jobStatus(warden, j, [enc({ date: '2026-05-10' })]).done).toBe(true) // first ever visit
    expect(jobStatus(warden, j, [enc({ date: '2026-05-10' }), enc({ date: '2025-04-02' })]).done).toBe(false) // spring before
    expect(jobStatus(warden, j, [enc({ date: '2026-05-10' }), enc({ date: '2026-01-02' })]).done).toBe(true) // winter before
    expect(jobStatus(warden, j, [enc({ date: '2026-05-10' }), enc({ date: '2026-05-02' })]).done).toBe(true) // same month is not earlier
  })
})

describe('trust', () => {
  const now = new Date(2026, 10, 8) // 8 Nov 2026
  it('levels follow the thresholds', () => {
    const at = (c: number) => trustLevel(c).level
    expect([0, 1, 2, 3, 5, 6, 9, 10, 40].map(at)).toEqual(['Newcomer', 'Visitor', 'Visitor', 'Regular', 'Regular', 'Local', 'Local', 'Friend of the reserve', 'Friend of the reserve'])
    expect(trustLevel(2).next).toEqual({ level: 'Regular', more: 1 })
    expect(trustLevel(10).next).toBeNull()
    expect(TRUST_LEVELS.map((l) => l.needs)).toEqual([0, 1, 3, 6, 10])
  })

  it('is Newcomer with no real outing there', () => {
    expect(trust(warden, [], now)).toMatchObject({ completed: 0, level: 'Newcomer', months: [] })
    expect(trust(warden, [enc({ source: 'sample' }), enc({ siteId: 'L999999' }), enc({ siteId: null })], now).months).toEqual([])
  })

  it('counts completed jobs over every month since the first real outing, rebuilt from the seed', () => {
    // A very easy log: every signature bird, heard and counted high, at every time of day, on a few days each month.
    const easy: Encounter[] = []
    for (const month of ['2026-08', '2026-09', '2026-10', '2026-11']) {
      for (const time of ['06:00', '12:00', '18:00', '22:00']) {
        for (const s of sig) easy.push(enc({ speciesId: s, date: `${month}-02`, time, mode: 'both', count: 50 }))
      }
    }
    const t = trust(warden, easy, now)
    expect(t.months).toEqual(['2026-08', '2026-09', '2026-10', '2026-11'])
    // Each month's two jobs are done, except a season job when the season repeats an earlier visit.
    const expected = t.months.reduce((total, month) => total + jobsFor(warden, month).filter((j) => jobStatus(warden, j, easy).done).length, 0)
    expect(t.completed).toBe(expected)
    expect(t.completed).toBeGreaterThanOrEqual(4)
    expect(trust(warden, easy, now)).toEqual(t) // deterministic
  })

  it('does not count months before your first outing, months after now, or sample/other-site logs', () => {
    const e = [enc({ date: '2026-10-05', speciesId: 'mute-swan', time: '06:00', mode: 'both', count: 80 })]
    expect(trust(warden, e, now).months).toEqual(['2026-10', '2026-11'])
    expect(trust(warden, e, new Date(2026, 9, 31)).months).toEqual(['2026-10'])
    expect(trust(warden, [enc({ date: '2027-03-01' })], now).months).toEqual([]) // an outing in the future starts nothing
    const noisy = [...e, ...Array.from({ length: 30 }, () => enc({ source: 'sample', date: '2026-10-06' })), ...Array.from({ length: 30 }, () => enc({ siteId: 'L999999', date: '2026-10-06' }))]
    expect(trust(warden, noisy, now).completed).toBe(trust(warden, e, now).completed)
  })
})
