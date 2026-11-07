import { useCallback, useEffect, useRef, useState } from 'react'
import { needsMotionPermission, requestMotionPermission } from './tilt'

interface CompassEvent {
  alpha: number | null
  absolute?: boolean
  webkitCompassHeading?: number
}

/** Compass heading in degrees (0 = north, clockwise) from an orientation event, or null if it can't tell. */
export function headingFromEvent(e: CompassEvent, screenAngle = 0): number | null {
  let h: number | null = null
  if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading
  else if (e.alpha !== null && e.absolute) h = 360 - e.alpha
  if (h === null) return null
  return (((h + screenAngle) % 360) + 360) % 360
}

export type PlaceState = { status: 'idle' } | { status: 'waiting' } | { status: 'ready'; point: [number, number]; accuracy: number } | { status: 'denied' } | { status: 'unavailable' }

/**
 * Where you are (for the radar) and which way the phone faces. Starts only when `active`, stops when it ends.
 * Nothing is stored or sent anywhere: the position lives in this component's state while the radar is open.
 */
export function useRadarSensors(active: boolean) {
  const [place, setPlace] = useState<PlaceState>({ status: 'idle' })
  const [heading, setHeading] = useState<number | null>(null)
  const [motionDenied, setMotionDenied] = useState(false)
  const lastHeading = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    if (!('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      (p) => setPlace({ status: 'ready', point: [p.coords.longitude, p.coords.latitude], accuracy: p.coords.accuracy }),
      (err) => setPlace(err.code === err.PERMISSION_DENIED ? { status: 'denied' } : { status: 'unavailable' }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [active])

  const listen = useCallback(() => {
    const onOrient = (e: DeviceOrientationEvent) => {
      const angle = typeof screen !== 'undefined' && screen.orientation ? screen.orientation.angle : 0
      const h = headingFromEvent(e as unknown as CompassEvent, angle)
      if (h === null) return
      // Light smoothing so the arrow doesn't jitter.
      const prev = lastHeading.current
      const out = prev === null ? h : smooth(prev, h)
      lastHeading.current = out
      setHeading(out)
    }
    window.addEventListener('deviceorientationabsolute', onOrient as EventListener)
    window.addEventListener('deviceorientation', onOrient)
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrient as EventListener)
      window.removeEventListener('deviceorientation', onOrient)
    }
  }, [])

  useEffect(() => {
    if (!active || needsMotionPermission()) return // iPhone: wait for the tap in enableCompass()
    return listen()
  }, [active, listen])

  const enableCompass = useCallback(async () => {
    if (!needsMotionPermission()) return
    if (await requestMotionPermission()) {
      listen()
    } else setMotionDenied(true)
  }, [listen])

  // Derived rather than set inside the effect: waiting until the first fix arrives, unavailable without GPS.
  const shownPlace: PlaceState = !active
    ? { status: 'idle' }
    : typeof navigator !== 'undefined' && !('geolocation' in navigator)
      ? { status: 'unavailable' }
      : place.status === 'idle'
        ? { status: 'waiting' }
        : place
  return { place: shownPlace, heading, motionDenied, needsTap: needsMotionPermission() && heading === null && !motionDenied, enableCompass }
}

/** Move 35% of the way round the shortest arc from a to b. */
export function smooth(a: number, b: number): number {
  const d = ((((b - a) % 360) + 540) % 360) - 180
  return (((a + d * 0.35) % 360) + 360) % 360
}
