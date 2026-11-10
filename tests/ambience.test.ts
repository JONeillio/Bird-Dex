import { describe, expect, it } from 'vitest'
import { BARS_PER_SECTION, PROGRESSIONS, barNotes, chirpSong, gullCall, isCoastal, midi, nextSongGapMs, progressionIndex, sceneForRoute, songLengthMs } from '../src/audio/ambienceScore'
import { mulberry32 } from '../src/domain/random'

describe('ambience: what plays where', () => {
  it('field sounds outdoors, music indoors, nothing on dev pages', () => {
    for (const r of ['map', 'find', 'plan', 'news']) expect(sceneForRoute(r)).toBe('field')
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
  it('each bar has bass on beats 1 and 3, notes inside the bar, and is the same every time', () => {
    for (let bar = 0; bar < 64; bar++) {
      const ns = barNotes(42, bar)
      expect(ns).toEqual(barNotes(42, bar))
      expect(ns.filter((n) => n.voice === 'bass').map((n) => n.beat)).toEqual([0, 2])
      for (const n of ns) {
        expect(n.beat).toBeGreaterThanOrEqual(0)
        expect(n.beat).toBeLessThan(4)
        expect(n.freq).toBeGreaterThan(40)
        expect(n.freq).toBeLessThan(1200)
      }
      expect(ns.filter((n) => n.voice === 'melody').length).toBeLessThanOrEqual(3)
    }
  })
  it('the melody only uses the pentatonic scale (no clashes)', () => {
    const allowed = new Set([72, 74, 76, 79, 81, 84].map((m) => midi(m).toFixed(2)))
    for (let bar = 0; bar < 200; bar++) for (const n of barNotes(7, bar)) if (n.voice === 'melody') expect(allowed).toContain(n.freq.toFixed(2))
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
