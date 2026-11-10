import { describe, expect, it } from 'vitest'
import { BARS_PER_SECTION, MELODY_NOTES, PROGRESSIONS, barNotes, phraseNotes, chirpSong, gullCall, isCoastal, midi, nextSongGapMs, progressionIndex, sceneForRoute, songLengthMs } from '../src/audio/ambienceScore'
import { mulberry32 } from '../src/domain/random'

describe('ambience: what plays where', () => {
  it('field sounds outdoors, music indoors, nothing on dev pages', () => {
    for (const r of ['map', 'find', 'plan', 'news']) expect(sceneForRoute(r)).toBe('field') // tune plus birdsong
    for (const r of ['dex', 'journal', 'folk', 'bird', 'settings', 'report', 'warden']) expect(sceneForRoute(r)).toBe('music')
    expect(sceneForRoute('dev')).toBe('none')
    expect(isCoastal('se-london')).toBe(true)
    expect(isCoastal('location-1')).toBe(false)
  })
})

describe('ambience: music', () => {
  it('starts on the home progression and never repeats one section to the next', () => {
    expect(progressionIndex(5, 0)).toBe(0)
    for (let seed = 1; seed < 30; seed++)
      for (let s = 1; s < 40; s++) {
        const i = progressionIndex(seed, s)
        expect(i).toBeGreaterThanOrEqual(0)
        expect(i).toBeLessThan(PROGRESSIONS.length)
        expect(i).not.toBe(progressionIndex(seed, s - 1))
      }
  })
  it('each bar has one long bass note, eight arpeggio notes, notes inside the bar, and is the same every time', () => {
    for (let bar = 0; bar < 64; bar++) {
      const ns = barNotes(42, bar)
      expect(ns).toEqual(barNotes(42, bar))
      expect(ns.filter((n) => n.voice === 'bass').map((n) => n.beat)).toEqual([0])
      expect(ns.filter((n) => n.voice === 'arp')).toHaveLength(8)
      for (const n of ns) {
        expect(n.beat).toBeGreaterThanOrEqual(0)
        expect(n.beat).toBeLessThan(4)
        expect(n.freq).toBeGreaterThan(40)
        expect(n.freq).toBeLessThan(1200)
      }
      expect(ns.filter((n) => n.voice === 'melody').length).toBeLessThanOrEqual(5)
    }
  })
  it('the melody stays in key and in range, waits four bars at the start, and rests every fourth section', () => {
    const allowed = new Set(MELODY_NOTES.map((m) => midi(m).toFixed(2)))
    for (let bar = 0; bar < 320; bar++) {
      const mel = barNotes(7, bar).filter((n) => n.voice === 'melody')
      const section = Math.floor(bar / 8)
      if (bar < 4 || section % 4 === 3) expect(mel).toHaveLength(0)
      for (const n of mel) expect(allowed).toContain(n.freq.toFixed(2))
    }
  })
  it('phrases fill two bars, repeat their rhythm in phrases 1 and 3, and the section ends on D', () => {
    for (let seed = 1; seed < 20; seed++)
      for (let section = 1; section < 12; section++) {
        const ph = [0, 1, 2, 3].map((p) => phraseNotes(seed, section, p))
        for (const p of ph) {
          const end = p.at(-1)!
          expect(end.beat + end.len).toBeLessThanOrEqual(8)
        }
        expect(ph[0].map((n) => n.len)).toEqual(ph[2].map((n) => n.len))
        expect([74, 78]).toContain(ph[3].at(-1)!.note)
        // Mostly stepwise: no leap bigger than a sixth.
        for (const p of ph) for (let i = 1; i < p.length; i++) expect(Math.abs(p[i].note - p[i - 1].note)).toBeLessThanOrEqual(9)
      }
  })
  it('chords change every two bars and sections are eight bars', () => {
    expect(BARS_PER_SECTION).toBe(8)
    const bass = (bar: number) => barNotes(1, bar)[0].freq
    expect(bass(0)).toBe(bass(1))
    expect(bass(2)).not.toBe(bass(0))
  })
})

describe('ambience: field sounds', () => {
  it('birdsong is short and high, gulls lower and longer', () => {
    const r = mulberry32(9)
    for (let i = 0; i < 200; i++) {
      const s = chirpSong(r)
      expect(s.length).toBeGreaterThanOrEqual(2)
      expect(s.length).toBeLessThanOrEqual(8)
      expect(songLengthMs(s)).toBeLessThan(1500)
      for (const c of s) expect(Math.min(c.from, c.to)).toBeGreaterThan(1200)
      const g = gullCall(r)
      for (const c of g) expect(c.from).toBeGreaterThan(c.to)
    }
  })
  it('birds sing most at dawn and least at night', () => {
    const avg = (hour: number) => {
      const r = mulberry32(1)
      let t = 0
      for (let i = 0; i < 500; i++) t += nextSongGapMs(r, hour)
      return t / 500
    }
    expect(avg(6)).toBeLessThan(avg(13))
    expect(avg(13)).toBeLessThan(avg(23))
    expect(avg(6)).toBeGreaterThan(1_500)
  })
})

describe('ambience is on by default', () => {
  it('for new phones, and switched on once for phones that saved prefs before 10 Nov', async () => {
    const { DEFAULT_PREFS, loadPrefs } = await import('../src/state/store')
    expect(DEFAULT_PREFS.ambienceOn).toBe(true)
    const store = new Map<string, string>()
    const ls = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) }
    Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true })
    store.set('bq.prefs', JSON.stringify({ areaV2: true, ambienceOn: false, toursDone: ['welcome'] }))
    expect(loadPrefs().ambienceOn).toBe(true)
    store.set('bq.prefs', JSON.stringify({ areaV2: true, audioV2: true, ambienceOn: false }))
    expect(loadPrefs().ambienceOn).toBe(false)
  })
})
