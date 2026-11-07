import { useEffect, useRef } from 'react'

/** Strength of a shake: how far the total acceleration is from resting gravity (about 9.8 m/s²). */
export function shakeStrength(x: number | null, y: number | null, z: number | null): number {
  if (x === null || y === null || z === null) return 0
  return Math.abs(Math.hypot(x, y, z) - 9.81)
}

export const SHAKE_THRESHOLD = 14
const COOLDOWN_MS = 1200

/** Calls `onShake` when the phone is shaken hard (not just walked with). Android needs no permission. */
export function useShake(onShake: () => void, enabled: boolean): void {
  const cb = useRef(onShake)
  useEffect(() => {
    cb.current = onShake
  })
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return
    let last = 0
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (!a || shakeStrength(a.x, a.y, a.z) < SHAKE_THRESHOLD) return
      const now = Date.now()
      if (now - last < COOLDOWN_MS) return
      last = now
      cb.current()
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [enabled])
}
