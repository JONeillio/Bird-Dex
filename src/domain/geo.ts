// Straight-line direction and distance, for the bird radar. Points are [longitude, latitude] like the rest of
// the app. Your position is only used on the phone to point an arrow; it is never stored or sent.
const R = 6371 // km
const rad = (d: number) => (d * Math.PI) / 180

/** Great-circle distance in kilometres. */
export function distanceKm(a: readonly [number, number], b: readonly [number, number]): number {
  const dLat = rad(b[1] - a[1])
  const dLng = rad(b[0] - a[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial compass bearing from a to b in degrees, 0 = north, clockwise, 0..360. */
export function bearingDeg(a: readonly [number, number], b: readonly [number, number]): number {
  const dLng = rad(b[0] - a[0])
  const y = Math.sin(dLng) * Math.cos(rad(b[1]))
  const x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(dLng)
  return (((Math.atan2(y, x) * 180) / Math.PI) % 360 + 360) % 360
}

const POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
export function compassWord(deg: number): string {
  return POINTS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]
}

/** Signed turn needed to face the target: -180..180, positive = turn right. */
export function turnNeeded(bearing: number, heading: number): number {
  return ((((bearing - heading) % 360) + 540) % 360) - 180
}

export function distanceLabel(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}
