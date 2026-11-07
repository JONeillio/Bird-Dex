// 8-bit sounds made in code (no audio files, nothing to license). Off unless the user turns it on, and the
// first sound has to come after a tap because browsers keep audio locked until then.
export type Note = readonly [freq: number, ms: number]

/** Pitch table for readability: semitones above C4. */
const C4 = 261.63
const n = (semitones: number) => C4 * 2 ** (semitones / 12)
const REST = 0

export const SOUNDS = {
  /** Opening jingle: a quick rising arpeggio. */
  start: [[n(0), 70], [n(4), 70], [n(7), 70], [n(12), 70], [n(16), 140]] as Note[],
  /** Moving between tabs. */
  blip: [[n(19), 35], [n(24), 45]] as Note[],
  /** Selecting something. */
  tick: [[n(28), 22]] as Note[],
  /** A bird recorded: short fanfare. Original tune. */
  catch: [[n(7), 90], [n(12), 90], [n(16), 90], [n(19), 150], [REST, 40], [n(16), 70], [n(19), 70], [n(24), 320]] as Note[],
  /** Something didn't work. */
  oops: [[n(-5), 90], [n(-12), 160]] as Note[],
} satisfies Record<string, Note[]>
export type SoundName = keyof typeof SOUNDS

/** Total length of a sound in milliseconds (used for scheduling and tests). */
export function soundLength(notes: readonly Note[]): number {
  return notes.reduce((t, [, ms]) => t + ms, 0)
}

let ctx: AudioContext | null = null

function context(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = typeof window === 'undefined' ? undefined : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    ctx = null
  }
  return ctx
}

/** Wake the audio system from a tap. Safe to call many times. */
export function unlockAudio(): void {
  const c = context()
  if (c && c.state === 'suspended') void c.resume()
}

export function play(name: SoundName, enabled: boolean): void {
  if (!enabled) return
  const c = context()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  let t = c.currentTime + 0.01
  for (const [freq, ms] of SOUNDS[name]) {
    const dur = ms / 1000
    if (freq > 0) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'square'
      osc.frequency.value = freq
      // Short attack and release stop clicks; the level is low so it never blasts in a quiet hide.
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.06, t + 0.005)
      gain.gain.setValueAtTime(0.06, t + Math.max(0.005, dur - 0.02))
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(gain).connect(c.destination)
      osc.start(t)
      osc.stop(t + dur + 0.02)
    }
    t += dur
  }
}
