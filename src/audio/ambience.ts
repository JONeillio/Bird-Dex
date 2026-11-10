// Ambience engine (AUTOPILOT S2, 10 Nov 2026). Turns ambienceScore.ts into sound with Web Audio: no files, nothing
// to license. Field sounds (soft wind and 8-bit birdsong, a gull on the coast) or slow chiptune music, faded between,
// dipped under Pearl's voice, silent when the page is hidden. Off until the user turns it on, and never before a tap.
import { BEAT_S, barNotes, chirpSong, gullCall, nextSongGapMs, type Chirp, type NoteEvent, type Scene } from './ambienceScore'
import { audioContext, setVoiceListener } from './sfx'

const FADE_S = 1.2
const LOOKAHEAD_S = 1.0
const TICK_MS = 250

const LEVEL = {
  wind: 0.018,
  chirp: 0.022,
  gull: 0.016,
  bass: 0.05,
  arp: 0.016,
  melody: 0.02,
} as const

class AmbienceEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private fieldBus: GainNode | null = null
  private musicBus: GainNode | null = null
  private wind: AudioBufferSourceNode | null = null
  private windGain: GainNode | null = null
  private scene: Scene = 'none'
  private volume = 0.5
  private on = false
  private coastal = false
  private timer = 0
  private songTimer = 0
  private windTimer = 0
  // Music position: the bar to schedule next and when it starts (AudioContext time).
  private seed = Math.floor(Math.random() * 1e6)
  private nextBar = 0
  private nextBarAt = 0
  private duckUntil = 0

  /** Turn on or off, and set the level (0–1). Call from a tap the first time so the browser allows audio. */
  configure(on: boolean, volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    if (on && !this.on) this.start()
    else if (!on && this.on) this.stop()
    this.applyMaster()
  }

  setScene(scene: Scene, coastal: boolean) {
    this.coastal = coastal
    if (scene === this.scene) return
    this.scene = scene
    if (this.on) this.crossfade()
  }

  private start() {
    const ctx = audioContext()
    if (!ctx) return
    this.ctx = ctx
    if (ctx.state === 'suspended') void ctx.resume()
    this.on = true
    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(ctx.destination)
    this.fieldBus = ctx.createGain()
    this.musicBus = ctx.createGain()
    this.fieldBus.gain.value = 0
    this.musicBus.gain.value = 0
    this.fieldBus.connect(this.master)
    this.musicBus.connect(this.master)
    this.startWind()
    this.nextBar = 0
    this.nextBarAt = ctx.currentTime + 0.3
    this.crossfade()
    this.applyMaster()
    this.timer = window.setInterval(() => this.tick(), TICK_MS)
    this.scheduleSong(1500)
    document.addEventListener('visibilitychange', this.onVisibility)
    setVoiceListener(() => this.duck())
  }

  private stop() {
    this.on = false
    window.clearInterval(this.timer)
    window.clearTimeout(this.songTimer)
    window.clearTimeout(this.windTimer)
    document.removeEventListener('visibilitychange', this.onVisibility)
    setVoiceListener(null)
    const ctx = this.ctx
    const master = this.master
    const wind = this.wind
    if (ctx && master) {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
      window.setTimeout(() => {
        try {
          wind?.stop()
        } catch {
          /* already stopped */
        }
        master.disconnect()
      }, 1500)
    }
    this.master = this.fieldBus = this.musicBus = this.windGain = null
    this.wind = null
  }

  private onVisibility = () => this.applyMaster()

  private applyMaster() {
    if (!this.ctx || !this.master) return
    const hidden = document.visibilityState !== 'visible'
    const ducked = this.ctx.currentTime < this.duckUntil
    const target = hidden ? 0 : this.volume * (ducked ? 0.45 : 1)
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, hidden ? 0.1 : 0.2)
  }

  /** Pearl is talking: dip for a moment. */
  private duck() {
    if (!this.ctx) return
    const was = this.ctx.currentTime < this.duckUntil
    this.duckUntil = this.ctx.currentTime + 0.6
    if (!was) this.applyMaster()
    window.setTimeout(() => this.applyMaster(), 650)
  }

  private crossfade() {
    if (!this.ctx || !this.fieldBus || !this.musicBus) return
    const t = this.ctx.currentTime
    this.fieldBus.gain.setTargetAtTime(this.scene === 'field' ? 1 : 0, t, FADE_S / 3)
    this.musicBus.gain.setTargetAtTime(this.scene === 'music' ? 1 : 0, t, FADE_S / 3)
    // Music picks up at the start of a bar shortly after it fades in.
    if (this.scene === 'music' && this.nextBarAt < t) this.nextBarAt = t + 0.2
  }

  // ---------- music ----------

  private tick() {
    const ctx = this.ctx
    if (!ctx || !this.musicBus || document.visibilityState !== 'visible') return
    if (this.scene !== 'music') {
      // Keep the clock moving so the tune resumes on a bar line, not mid-phrase.
      while (this.nextBarAt < ctx.currentTime) {
        this.nextBarAt += 4 * BEAT_S
        this.nextBar++
      }
      return
    }
    while (this.nextBarAt < ctx.currentTime + LOOKAHEAD_S) {
      for (const n of barNotes(this.seed, this.nextBar)) this.note(n, this.nextBarAt)
      this.nextBarAt += 4 * BEAT_S
      this.nextBar++
    }
  }

  private note(n: NoteEvent, barAt: number) {
    const ctx = this.ctx!
    const t = barAt + n.beat * BEAT_S
    if (t < ctx.currentTime) return
    const dur = n.len * BEAT_S
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = n.voice === 'arp' ? 'square' : 'triangle'
    osc.frequency.value = n.freq
    const peak = LEVEL[n.voice]
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + (n.voice === 'melody' ? 0.08 : 0.01))
    g.gain.exponentialRampToValueAtTime(peak * 0.5, t + dur * 0.6)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g).connect(this.musicBus!)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  }

  // ---------- field ----------

  private startWind() {
    const ctx = this.ctx!
    // Two seconds of soft brown noise, looped, through a low filter: a breeze rather than a hiss.
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      d[i] = last * 3.5
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    const g = ctx.createGain()
    g.gain.value = LEVEL.wind
    src.connect(lp).connect(g).connect(this.fieldBus!)
    src.start()
    this.wind = src
    this.windGain = g
    // Gusts: drift the level every few seconds.
    const gust = () => {
      if (!this.on || !this.ctx || !this.windGain) return
      this.windGain.gain.setTargetAtTime(LEVEL.wind * (0.5 + Math.random()), this.ctx.currentTime, 1.5)
      this.windTimer = window.setTimeout(gust, 2500 + Math.random() * 3000)
    }
    gust()
  }

  private scheduleSong(ms: number) {
    this.songTimer = window.setTimeout(() => {
      if (!this.on) return
      if (this.scene === 'field' && document.visibilityState === 'visible') {
        if (this.coastal && Math.random() < 0.12) this.sing(gullCall(Math.random), LEVEL.gull, 'sawtooth', 900)
        else this.sing(chirpSong(Math.random), LEVEL.chirp, 'square', 0)
      }
      this.scheduleSong(nextSongGapMs(Math.random, new Date().getHours()))
    }, ms)
  }

  /** Play a song of chirps. A gull is softened through a low-pass filter. */
  private sing(song: readonly Chirp[], level: number, type: OscillatorType, lowpass: number) {
    const ctx = this.ctx
    if (!ctx || !this.fieldBus) return
    let out: AudioNode = this.fieldBus
    if (lowpass) {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = lowpass * 2
      f.connect(this.fieldBus)
      out = f
    }
    // Each song comes from a slightly different direction.
    if (typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner()
      p.pan.value = Math.random() * 1.4 - 0.7
      p.connect(out)
      out = p
    }
    let t = ctx.currentTime + 0.02
    for (const c of song) {
      const d = c.ms / 1000
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(c.from, t)
      osc.frequency.exponentialRampToValueAtTime(c.to, t + d)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(level, t + Math.min(0.01, d / 3))
      g.gain.exponentialRampToValueAtTime(0.0001, t + d)
      osc.connect(g).connect(out)
      osc.start(t)
      osc.stop(t + d + 0.02)
      t += d + c.gapMs / 1000
    }
  }
}

/** The one ambience player for the app. */
export const ambience = new AmbienceEngine()
