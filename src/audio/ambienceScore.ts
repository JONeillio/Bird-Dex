// Ambience (AUTOPILOT S2, 10 Nov 2026): what to play, worked out without any audio, so it can be tested.
// Field sounds on the map screens (soft wind and 8-bit birdsong), slow chiptune music everywhere else.
// The engine that turns this into sound is ambience.ts.

export type Rng = () => number
export type Scene = 'field' | 'music' | 'none'

/** Outdoors screens get field sounds; the dev pages stay quiet; the rest get music. */
export function sceneForRoute(name: string): Scene {
  if (name === 'dev') return 'none'
  if (name === 'map' || name === 'find' || name === 'plan' || name === 'news') return 'field'
  return 'music'
}

/** Areas on the coast or an estuary, where a gull calls now and then. */
export function isCoastal(regionId: string): boolean {
  return regionId === 'se-london' || regionId === 'southampton'
}

// ---------- Music ----------

/** Equal-tempered pitch: MIDI note number to Hz. */
export const midi = (n: number): number => 440 * 2 ** ((n - 69) / 12)

export const BPM = 70
export const BEAT_S = 60 / BPM
export const BARS_PER_CHORD = 2
export const BARS_PER_SECTION = 8

/** Chords as MIDI roots in C major, with their triad (major or minor). */
type Chord = { root: number; minor: boolean }
const C: Chord = { root: 48, minor: false }
const Am: Chord = { root: 45, minor: true }
const F: Chord = { root: 41, minor: false }
const G: Chord = { root: 43, minor: false }
const Dm: Chord = { root: 50, minor: true }
const Em: Chord = { root: 52, minor: true }

/** Gentle, folky progressions: four chords, two bars each, so one section is eight bars. */
export const PROGRESSIONS: Chord[][] = [
  [C, Am, F, G],
  [F, C, G, Am],
  [Am, F, C, G],
  [C, Em, F, C],
  [Dm, G, C, Am],
]

/** Which progression a section uses: wanders between the five, never the same one twice running. */
export function progressionIndex(seed: number, section: number, rng: (s: number) => number = hashRand): number {
  let prev = 0
  for (let k = 1; k <= section; k++) {
    let i = Math.floor(rng(seed * 7919 + k) * (PROGRESSIONS.length - 1))
    if (i >= prev) i++
    prev = i
  }
  return prev
}

/** One random number per integer seed (for the music, so bar N always sounds the same in one session). */
export function hashRand(s: number): number {
  let x = Math.imul(s ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

export interface NoteEvent {
  voice: 'bass' | 'arp' | 'melody'
  /** Start, in beats from the start of the bar. */
  beat: number
  /** Length in beats. */
  len: number
  freq: number
}

const triad = (c: Chord) => [c.root, c.root + (c.minor ? 3 : 4), c.root + 7]
/** C major pentatonic, high (C5 to A5 and the C above): no wrong notes over any of these chords. */
const PENTA = [72, 74, 76, 79, 81, 84]

/** The notes of one bar. Bass on beats 1 and 3, a soft arpeggio on eighths with a few gaps, a sparse melody. */
export function barNotes(seed: number, bar: number): NoteEvent[] {
  const section = Math.floor(bar / BARS_PER_SECTION)
  const chord = PROGRESSIONS[progressionIndex(seed, section)][Math.floor((bar % BARS_PER_SECTION) / BARS_PER_CHORD)]
  const t = triad(chord)
  const r = (k: number) => hashRand(seed * 1_000_003 + bar * 101 + k)
  const out: NoteEvent[] = [
    { voice: 'bass', beat: 0, len: 1.8, freq: midi(chord.root - 12) },
    { voice: 'bass', beat: 2, len: 1.8, freq: midi((r(1) < 0.5 ? chord.root : chord.root + 7) - 12) },
  ]
  // Arpeggio: up, or up-and-down, one octave up; about one eighth in six is a rest.
  const shape = r(2) < 0.5 ? [0, 1, 2, 1, 0, 1, 2, 1] : [0, 1, 2, 0, 1, 2, 1, 0]
  shape.forEach((k, i) => {
    if (r(10 + i) < 0.17) return
    out.push({ voice: 'arp', beat: i / 2, len: 0.42, freq: midi(t[k] + 12) })
  })
  // Melody: about half the bars get one to three long notes from the pentatonic scale.
  if (r(3) < 0.5) {
    const n = 1 + Math.floor(r(4) * 3)
    let pos = Math.floor(r(5) * 2)
    for (let i = 0; i < n && pos < 4; i++) {
      out.push({ voice: 'melody', beat: pos, len: 1.5, freq: midi(PENTA[Math.floor(r(20 + i) * PENTA.length)]) })
      pos += 1 + Math.floor(r(30 + i) * 2)
    }
  }
  return out
}

// ---------- Field sounds ----------

/** One chirp note: a quick pitch sweep. */
export interface Chirp {
  from: number
  to: number
  ms: number
  /** Silence after it. */
  gapMs: number
}

/** A short 8-bit birdsong: 2–6 chirps of one of a few kinds (whistle, trill, two-note call). */
export function chirpSong(rng: Rng): Chirp[] {
  const kind = rng()
  const base = 2200 + rng() * 2400
  if (kind < 0.4) {
    // Trill: fast repeated down-sweeps.
    const n = 4 + Math.floor(rng() * 5)
    return Array.from({ length: n }, () => ({ from: base * 1.15, to: base * 0.85, ms: 35, gapMs: 25 }))
  }
  if (kind < 0.75) {
    // Two-note call, said twice: high-low, high-low.
    const lo = base * (0.7 + rng() * 0.1)
    const reps = rng() < 0.5 ? 1 : 2
    return Array.from({ length: reps }, () => [
      { from: base, to: base * 1.05, ms: 90, gapMs: 40 },
      { from: lo, to: lo * 0.95, ms: 110, gapMs: 260 },
    ]).flat()
  }
  // Rising whistle then a flourish.
  return [
    { from: base * 0.7, to: base * 1.2, ms: 160, gapMs: 60 },
    { from: base * 1.3, to: base * 1.0, ms: 60, gapMs: 30 },
    { from: base * 1.2, to: base * 0.9, ms: 60, gapMs: 0 },
  ]
}

/** A distant gull: two or three long, falling, slightly nasal calls. */
export function gullCall(rng: Rng): Chirp[] {
  const n = 2 + Math.floor(rng() * 2)
  return Array.from({ length: n }, (_, i) => ({ from: 1300 - i * 60, to: 750 - i * 40, ms: 260, gapMs: 120 }))
}

/** Birds sing most at dawn, a little at dusk, and are quiet at night. Gap until the next song, in ms. */
export function nextSongGapMs(rng: Rng, hour: number): number {
  const busy = hour >= 4 && hour < 9 ? 0.5 : hour >= 17 && hour < 20 ? 0.75 : hour >= 22 || hour < 4 ? 2.2 : 1
  return Math.round((4_000 + rng() * 8_000) * busy)
}

export function songLengthMs(song: readonly Chirp[]): number {
  return song.reduce((t, c) => t + c.ms + c.gapMs, 0)
}
