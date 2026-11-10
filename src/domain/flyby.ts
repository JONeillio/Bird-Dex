// Fly-bys (AUTOPILOT H4, 10 Nov 2026): now and then a small bird, a pair, or in winter a little V of geese, crosses
// the map. Decoration only: never tappable, never a marker, rare enough not to compete with the pins.
// Pure (takes a random function) so the timing and paths can be tested.

export type Rng = () => number

export interface Point {
  x: number
  y: number
}

export interface Flight {
  kind: 'single' | 'pair' | 'geese'
  /** Each bird's offset from the leader, in CSS px, in the leader's frame (x back along the path, y across it). */
  flock: Point[]
  from: Point
  /** Quadratic curve control point (gives the gentle arc). */
  ctrl: Point
  to: Point
  durationMs: number
  /** Travelling left to right. */
  rightward: boolean
  /** Leader's sprite scale. */
  scale: number
}

const between = (rng: Rng, a: number, b: number) => a + (b - a) * rng()

/** First fly-by soon after the map opens, so people notice them; then every 35–70 s. */
export function firstDelayMs(rng: Rng): number {
  return Math.round(between(rng, 15_000, 25_000))
}
export function nextDelayMs(rng: Rng): number {
  return Math.round(between(rng, 35_000, 70_000))
}

/** How long the map must have been left alone before a bird crosses it. */
export const STILL_MS = 5_000

/** Geese only in winter (November to February). */
export function isGooseSeason(month: number): boolean {
  return month === 11 || month === 12 || month === 1 || month === 2
}

export function pickKind(rng: Rng, month: number): Flight['kind'] {
  if (isGooseSeason(month) && rng() < 0.1) return 'geese'
  return rng() < 0.25 ? 'pair' : 'single'
}

const FLOCKS: Record<Flight['kind'], Point[]> = {
  single: [{ x: 0, y: 0 }],
  pair: [
    { x: 0, y: 0 },
    { x: 22, y: 7 },
  ],
  geese: [
    { x: 0, y: 0 },
    { x: 16, y: -10 },
    { x: 16, y: 10 },
    { x: 32, y: -20 },
    { x: 32, y: 20 },
  ],
}

/**
 * A path across the map. It stays in the band between the top of the map and `clearBottom` (the top of the site
 * card, minus a margin), starts and ends just off screen, and bows gently upwards.
 */
export function planFlight(rng: Rng, area: { w: number; h: number; clearBottom: number }, month: number): Flight {
  const kind = pickKind(rng, month)
  const top = Math.max(24, area.h * 0.08)
  const bottom = Math.max(top + 20, Math.min(area.clearBottom - 40, area.h * 0.7))
  const y0 = between(rng, top, bottom)
  const y1 = Math.min(bottom, Math.max(top, y0 + between(rng, -40, 40)))
  const rightward = rng() < 0.5
  const off = 60
  const from = { x: rightward ? -off : area.w + off, y: y0 }
  const to = { x: rightward ? area.w + off : -off, y: y1 }
  const ctrl = { x: area.w / 2, y: Math.max(8, (y0 + y1) / 2 - between(rng, 15, 45)) }
  const base = kind === 'geese' ? between(rng, 7_000, 9_000) : between(rng, 4_000, 6_000)
  // Same speed on a wide screen as on a phone (412 px is the reference).
  const durationMs = Math.round(base * Math.max(0.8, (area.w + 2 * off) / 532))
  return { kind, flock: FLOCKS[kind], from, ctrl, to, durationMs, rightward, scale: kind === 'geese' ? 2 : 2 }
}

/** Where the leader is at progress p (0–1) along the curve, and which way it is heading (radians). */
export function pointAt(f: Pick<Flight, 'from' | 'ctrl' | 'to'>, p: number): Point & { angle: number } {
  const q = 1 - p
  const x = q * q * f.from.x + 2 * q * p * f.ctrl.x + p * p * f.to.x
  const y = q * q * f.from.y + 2 * q * p * f.ctrl.y + p * p * f.to.y
  const dx = 2 * q * (f.ctrl.x - f.from.x) + 2 * p * (f.to.x - f.ctrl.x)
  const dy = 2 * q * (f.ctrl.y - f.from.y) + 2 * p * (f.to.y - f.ctrl.y)
  return { x, y, angle: Math.atan2(dy, dx) }
}

/** Wings: a few flaps, a glide, a couple more flaps, then glide off. 0 = wings up, 1 = wings down/level. */
export function wingFrame(p: number, elapsedMs: number, flapMs = 110): 0 | 1 {
  const flapping = p < 0.32 || (p > 0.62 && p < 0.76)
  if (!flapping) return 1
  return Math.floor(elapsedMs / flapMs) % 2 === 0 ? 0 : 1
}

/** Whether a bird may fly now. */
export function mayFly(s: { enabled: boolean; reducedMotion: boolean; visible: boolean; busy: boolean; stillForMs: number }): boolean {
  return s.enabled && !s.reducedMotion && s.visible && !s.busy && s.stillForMs >= STILL_MS
}
