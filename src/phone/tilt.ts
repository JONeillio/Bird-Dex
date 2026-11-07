import { useEffect, useRef } from 'react'

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Normalise phone orientation to -1..1: x leans left/right, y leans forward/back around a natural holding angle. */
export function tiltFromOrientation(beta: number | null, gamma: number | null): { x: number; y: number } {
  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
  return { x: clamp((gamma ?? 0) / 30), y: clamp(((beta ?? 45) - 45) / 30) }
}

/** iPhone needs a tap to allow motion sensors; Android doesn't. Returns whether tilt can work. */
export function tiltSupported(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
}

export function needsMotionPermission(): boolean {
  const D = typeof window !== 'undefined' ? (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent : undefined
  return typeof D?.requestPermission === 'function'
}

export async function requestMotionPermission(): Promise<boolean> {
  const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent
  if (typeof D?.requestPermission !== 'function') return true
  try {
    return (await D.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

/**
 * Writes --tilt-x and --tilt-y (-1..1, smoothed) onto the element while it is mounted, so CSS can react to the
 * phone leaning without re-rendering React. Does nothing when off, when the phone asks for reduced motion, or
 * when there is no sensor (desktop).
 */
export function useTilt<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!enabled || !el || !tiltSupported() || reduced()) return
    let target = { x: 0, y: 0 }
    let cur = { x: 0, y: 0 }
    let raf = 0
    let seen = false
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta === null && e.gamma === null) return
      seen = true
      target = tiltFromOrientation(e.beta, e.gamma)
    }
    const tick = () => {
      cur = { x: cur.x + (target.x - cur.x) * 0.12, y: cur.y + (target.y - cur.y) * 0.12 }
      if (seen) {
        el.style.setProperty('--tilt-x', cur.x.toFixed(3))
        el.style.setProperty('--tilt-y', cur.y.toFixed(3))
      }
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('deviceorientation', onOrient)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('deviceorientation', onOrient)
      cancelAnimationFrame(raf)
    }
  }, [enabled])
  return ref
}
