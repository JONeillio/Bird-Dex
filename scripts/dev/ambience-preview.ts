// Renders a listenable preview of the ambience (music, then field sounds) from the same score the app plays, to a WAV.
// The app makes the sound live with Web Audio (src/audio/ambience.ts); this is a close offline copy for listening.
// npx tsx scripts/dev/ambience-preview.ts /tmp/ambience-preview.wav
import { writeFileSync } from 'node:fs'
import { BEAT_S, barNotes, chirpSong, gullCall, nextSongGapMs, type Chirp } from '../../src/audio/ambienceScore'
import { mulberry32 } from '../../src/domain/random'

const SR = 44100
const MUSIC_S = 36
const FIELD_S = 24
const out = new Float32Array(SR * (MUSIC_S + FIELD_S))
const LEVEL = { bass: 0.05, arp: 0.016, melody: 0.02 }
const VOL = 4 // the app's master volume at 0.5 sits on a quiet phone speaker; louder here so a laptop can hear it

const square = (ph: number) => (ph % 1 < 0.5 ? 1 : -1)
const triangle = (ph: number) => 4 * Math.abs((ph % 1) - 0.5) - 1

function tone(start: number, dur: number, f0: number, f1: number, level: number, wave: (p: number) => number, attack = 0.01) {
  const a = Math.floor(start * SR)
  const n = Math.floor(dur * SR)
  let ph = 0
  for (let i = 0; i < n && a + i < out.length; i++) {
    const t = i / SR
    const f = f0 * (f1 / f0) ** (t / dur)
    ph += f / SR
    const env = t < attack ? t / attack : Math.exp((-3 * (t - attack)) / dur)
    out[a + i] += wave(ph) * level * env * VOL
  }
}

// Music: bars from the score.
const seed = 1234
for (let bar = 0, at = 0; at < MUSIC_S - 2; bar++, at += 4 * BEAT_S)
  for (const n of barNotes(seed, bar)) tone(at + n.beat * BEAT_S, n.len * BEAT_S, n.freq, n.freq, LEVEL[n.voice], n.voice === 'arp' ? square : triangle, n.voice === 'melody' ? 0.08 : 0.01)

// Field: soft brown-noise wind with gusts, and songs at dawn spacing, with one gull.
const r = mulberry32(5)
let last = 0
let lp = 0
const k = 1 - Math.exp((-2 * Math.PI * 420) / SR) // the app's 420 Hz low-pass
for (let i = SR * MUSIC_S; i < out.length; i++) {
  last = (last + 0.02 * (r() * 2 - 1)) / 1.02
  lp += k * (last * 3.5 - lp)
  const gust = 0.6 + 0.4 * Math.sin((i / SR) * 0.7)
  out[i] += lp * 0.018 * gust * VOL
}
const sing = (song: Chirp[], at: number, level: number) => {
  let t = at
  for (const c of song) {
    tone(t, c.ms / 1000, c.from, c.to, level, square, 0.005)
    t += (c.ms + c.gapMs) / 1000
  }
}
for (let t = MUSIC_S + 1, k = 0; t < MUSIC_S + FIELD_S - 1.5; t += nextSongGapMs(r, 6) / 1000, k++) sing(k === 3 ? gullCall(r) : chirpSong(r), t, k === 3 ? 0.016 : 0.022)

// 16-bit mono WAV.
const pcm = Buffer.alloc(out.length * 2)
for (let i = 0; i < out.length; i++) pcm.writeInt16LE(Math.max(-1, Math.min(1, out[i])) * 32767, i * 2)
const h = Buffer.alloc(44)
h.write('RIFF', 0)
h.writeUInt32LE(36 + pcm.length, 4)
h.write('WAVEfmt ', 8)
h.writeUInt32LE(16, 16)
h.writeUInt16LE(1, 20)
h.writeUInt16LE(1, 22)
h.writeUInt32LE(SR, 24)
h.writeUInt32LE(SR * 2, 28)
h.writeUInt16LE(2, 32)
h.writeUInt16LE(16, 34)
h.write('data', 36)
h.writeUInt32LE(pcm.length, 40)
writeFileSync(process.argv[2] ?? '/tmp/ambience-preview.wav', Buffer.concat([h, pcm]))
console.log(`wrote ${MUSIC_S}s of music then ${FIELD_S}s of field sounds`)
