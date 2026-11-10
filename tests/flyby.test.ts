import { describe, expect, it } from 'vitest'
import { firstDelayMs, isGooseSeason, mayFly, nextDelayMs, pickKind, planFlight, pointAt, wingFrame, STILL_MS } from '../src/domain/flyby'
import { mulberry32 } from '../src/domain/random'

const seq = (...xs: number[]) => {
  let i = 0
  return () => xs[i++ % xs.length]
}

describe('fly-bys', () => {
  it('first comes within 15–25 s, then every 35–70 s', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 200; i++) {
      const a = firstDelayMs(r)
      const b = nextDelayMs(r)
      expect(a).toBeGreaterThanOrEqual(15_000)
      expect(a).toBeLessThanOrEqual(25_000)
      expect(b).toBeGreaterThanOrEqual(35_000)
      expect(b).toBeLessThanOrEqual(70_000)
    }
  })
  it('geese only in winter; otherwise mostly single birds, sometimes a pair', () => {
    expect(isGooseSeason(11) && isGooseSeason(2)).toBe(true)
    expect(isGooseSeason(6)).toBe(false)
    expect(pickKind(seq(0.05), 12)).toBe('geese')
    expect(pickKind(seq(0.05), 6)).toBe('pair')
    expect(pickKind(seq(0.5, 0.9), 6)).toBe('single')
    const r = mulberry32(3)
    const kinds = Array.from({ length: 2000 }, () => pickKind(r, 7))
    expect(kinds.filter((k) => k === 'geese')).toHaveLength(0)
    const pairs = kinds.filter((k) => k === 'pair').length / kinds.length
    expect(pairs).toBeGreaterThan(0.2)
    expect(pairs).toBeLessThan(0.3)
  })
  it('crosses the whole screen, starting and ending off it, and stays above the card', () => {
    const r = mulberry32(11)
    const area = { w: 412, h: 650, clearBottom: 540 }
    for (let i = 0; i < 300; i++) {
      const f = planFlight(r, area, 12)
      expect(Math.min(f.from.x, f.to.x)).toBeLessThan(0)
      expect(Math.max(f.from.x, f.to.x)).toBeGreaterThan(area.w)
      for (let p = 0; p <= 1; p += 0.05) {
        const pt = pointAt(f, p)
        expect(pt.y).toBeLessThan(area.clearBottom - 30)
        expect(pt.y).toBeGreaterThan(0)
      }
      expect(f.durationMs).toBeGreaterThanOrEqual(3_200)
      expect(f.durationMs).toBeLessThanOrEqual(9_000)
      expect(f.flock.length).toBe(f.kind === 'geese' ? 5 : f.kind === 'pair' ? 2 : 1)
    }
  })
  it('flaps, glides, flaps again, then glides off', () => {
    expect(wingFrame(0.1, 0)).toBe(0)
    expect(wingFrame(0.1, 110)).toBe(1)
    expect(wingFrame(0.5, 0)).toBe(1)
    expect(wingFrame(0.7, 0)).toBe(0)
    expect(wingFrame(0.9, 0)).toBe(1)
  })
  it('only flies when allowed, the map is still and nothing is open', () => {
    const ok = { enabled: true, reducedMotion: false, visible: true, busy: false, stillForMs: STILL_MS }
    expect(mayFly(ok)).toBe(true)
    expect(mayFly({ ...ok, enabled: false })).toBe(false)
    expect(mayFly({ ...ok, reducedMotion: true })).toBe(false)
    expect(mayFly({ ...ok, visible: false })).toBe(false)
    expect(mayFly({ ...ok, busy: true })).toBe(false)
    expect(mayFly({ ...ok, stillForMs: 1000 })).toBe(false)
  })
})
