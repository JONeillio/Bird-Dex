// Ambience (AUTOPILOT S2, 10 Nov 2026): what to play, worked out without any audio, so it can be tested.
// The tune plays everywhere; on the map screens it is quieter, with soft wind and 8-bit birdsong over it.
// The engine that turns this into sound is ambience.ts.

export type Rng = () => number
export type Scene = 'field' | 'music' | 'none'

/** Outdoors screens get the tune with birdsong over it ('field'); the dev pages stay quiet; the rest get the tune. */
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
// 10 Nov (Joseph): softer, "like the start of an old adventure game on the map screen". An original tune in that
// spirit: D major with the odd flattened seventh for an open-air feel, a slow rolling arpeggio, a soft lead melody
// built from repeating phrases, long bass notes. Echo and filtering are added by the engine.

/** Equal-tempered pitch: MIDI note number to Hz. */
export const midi = (n: number): number => 440 * 2 ** ((n - 69) / 12)

export const BPM = 76
export const BEAT_S = 60 / BPM
export const BARS_PER_CHORD = 2
export const BARS_PER_SECTION = 8

/** A chord: MIDI root (bass octave) and its three notes as semitones above the root. */
type Chord = { root: number; tones: [number, number, number] }
const maj = (root: number): Chord => ({ root, tones: [0, 4, 7] })
const min = (root: number): Chord => ({ root, tones: [0, 3, 7] })
const D = maj(38)
const C = maj(36)
const G = maj(43)
const A = maj(45)
const Bm = min(47)
const Em = min(40)
const Fsm = min(42)

/** Four chords, two bars each, so one section is eight bars. The first is the "setting out" one. */
export const PROGRESSIONS: Chord[][] = [
  [D, C, G, D],
  [Bm, G, D, A],
  [G, A, Fsm, Bm],
  [D, Em, G, A],
  [G, D, C, D],
]

/** One random number per integer seed (so bar N always sounds the same in one session). */
export function hashRand(s: number): number {
  let x = Math.imul(s ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

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

export function chordAt(seed: number, bar: number): Chord {
  const section = Math.floor(bar / BARS_PER_SECTION)
  return PROGRESSIONS[progressionIndex(seed, section)][Math.floor((bar % BARS_PER_SECTION) / BARS_PER_CHORD)]
}

export interface NoteEvent {
  voice: 'bass' | 'arp' | 'melody'
  /** Start, in beats from the start of the bar. */
  beat: number
  /** Length in beats. */
  len: number
  freq: number
}

/** The melody's notes: D major plus C natural (the open, folky seventh), from A4 up to A5. */
export const MELODY_NOTES = [69, 71, 72, 73, 74, 76, 78, 79, 81]
const SCALE = [69, 71, 73, 74, 76, 78, 79, 81]

/** Phrase rhythms (two bars = 8 beats); a negative number is a rest. */
const RHYTHMS = [
  [1.5, 0.5, 1, 1, 3, -1],
  [1, 1, 1, 1, 2, 2],
  [2, 1, 1, 3, -1],
  [0.5, 0.5, 1, 2, 1, 1, 2],
]

/** Nearest note in `pool` to `target`. */
const nearest = (pool: number[], target: number) => pool.reduce((b, n) => (Math.abs(n - target) < Math.abs(b - target) ? n : b))

/** The chord's notes in the melody's range. */
function chordTonesHigh(c: Chord): number[] {
  const pcs = c.tones.map((t) => (c.root + t) % 12)
  const out: number[] = []
  for (let n = 69; n <= 81; n++) if (pcs.includes(n % 12)) out.push(n)
  return out
}

/**
 * A two-bar melody phrase. Phrases 1 and 3 of a section share a rhythm (a tune you can hum); 2 and 4 differ. It
 * starts and lands on chord notes, moves mostly by step, and the last phrase of a section comes home to D.
 */
export function phraseNotes(seed: number, section: number, phrase: number): { beat: number; len: number; note: number }[] {
  const r = (k: number) => hashRand(seed * 3_000_017 + section * 977 + phrase * 31 + k)
  const shape = [0, 1 + Math.floor(r(1) * 3), 0, 1 + Math.floor(r(2) * 3)][phrase]
  const rhythm = RHYTHMS[shape]
  const chord = PROGRESSIONS[progressionIndex(seed, section)][phrase]
  const tones = chordTonesHigh(chord)
  let note = nearest(tones, 70 + r(3) * 9)
  const out: { beat: number; len: number; note: number }[] = []
  let beat = 0
  let dir = r(4) < 0.5 ? -1 : 1
  rhythm.forEach((len, i) => {
    if (len < 0) {
      beat += -len
      return
    }
    const last = i === rhythm.length - 1 || (i === rhythm.length - 2 && rhythm[rhythm.length - 1] < 0)
    if (i > 0) {
      // Step through the scale; change direction now and then, and at the edges.
      if (r(10 + i) < 0.3) dir = -dir
      let idx = SCALE.indexOf(nearest(SCALE, note)) + dir * (r(20 + i) < 0.75 ? 1 : 2)
      if (idx < 0 || idx >= SCALE.length) {
        dir = -dir
        idx = Math.max(0, Math.min(SCALE.length - 1, idx + 2 * dir))
      }
      note = SCALE[idx]
      // The C natural colours the C chord only.
      if (chord.root % 12 === 0 && note === 73 && r(30 + i) < 0.6) note = 72
    }
    // Long notes and the phrase ending sit on a chord note; the section's last note is D.
    if (len >= 2 || last) note = phrase === 3 && last ? nearest([74, 78], note) : nearest(tones, note)
    out.push({ beat, len, note })
    beat += len
  })
  return out
}

/** The notes of one bar. Long soft bass, a rolling arpeggio in eighths, and the melody (resting every fourth section). */
export function barNotes(seed: number, bar: number): NoteEvent[] {
  const section = Math.floor(bar / BARS_PER_SECTION)
  const chord = chordAt(seed, bar)
  const out: NoteEvent[] = [{ voice: 'bass', beat: 0, len: 3.8, freq: midi(chord.root) }]
  // Arpeggio: root, third, fifth, octave, tenth and back down, around middle C.
  const up = [0, chord.tones[1], 7, 12, 12 + chord.tones[1]]
  const order = [0, 1, 2, 3, 4, 3, 2, 1]
  order.forEach((k, i) => out.push({ voice: 'arp', beat: i / 2, len: 0.6, freq: midi(chord.root + 12 + up[k]) }))
  // Melody: two-bar phrases. The opening has four bars of arpeggio first, as if setting off; every fourth section rests.
  const phrase = Math.floor((bar % BARS_PER_SECTION) / 2)
  if (section % 4 !== 3 && !(section === 0 && phrase < 2)) {
    const half = (bar % 2) * 4
    for (const n of phraseNotes(seed, section, phrase))
      if (n.beat >= half && n.beat < half + 4) out.push({ voice: 'melody', beat: n.beat - half, len: Math.min(n.len, half + 4 - n.beat + 0.5), freq: midi(n.note) })
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
