// Sunrise and sunset worked out on the phone with the standard NOAA / "sunrise equation" solar formula.
// No network, no API. Good to about a minute at UK latitudes. Pure.

const RAD = Math.PI / 180

export interface SunTimes {
  /** HH:MM local time, or null when the sun does not rise that day (polar night). */
  sunrise: string | null
  /** HH:MM local time, or null when it does not set (midnight sun). */
  sunset: string | null
}

export interface SunOptions {
  /** IANA time zone the HH:MM are shown in. Default Europe/London (the app is for the UK). */
  timeZone?: string
}

const hm = (ms: number, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(ms))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('hour') === '24' ? '00' : get('hour')}:${get('minute')}`
}

/** `date` is the calendar day at the place, as YYYY-MM-DD (or a Date, whose local year, month and day are used). */
export function sunTimes(lngLat: readonly [number, number], date: string | Date, opts: SunOptions = {}): SunTimes {
  const [lng, lat] = lngLat
  const tz = opts.timeZone ?? 'Europe/London'
  let y: number, m: number, d: number
  if (typeof date === 'string') {
    const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
    if (!a) return { sunrise: null, sunset: null }
    ;[y, m, d] = [Number(a[1]), Number(a[2]), Number(a[3])]
  } else [y, m, d] = [date.getFullYear(), date.getMonth() + 1, date.getDate()]

  // Days since J2000.0 at noon UT on that date, then the mean solar time at this longitude.
  const jdNoon = Date.UTC(y, m - 1, d, 12) / 86400000 + 2440587.5
  const n = Math.ceil(jdNoon - 2451545.0 + 0.0008)
  const jStar = n - lng / 360 // west of Greenwich (negative) is later in the day
  const M = (357.5291 + 0.98560028 * jStar) % 360
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD)
  const lambda = (M + C + 180 + 102.9372) % 360
  const transit = 2451545.0 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD)
  const decl = Math.asin(Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD))
  // -0.833 degrees: the sun's disc and the bending of its light by the air at the horizon.
  const cosH = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(decl)) / (Math.cos(lat * RAD) * Math.cos(decl))
  if (cosH > 1) return { sunrise: null, sunset: null } // the sun stays down
  if (cosH < -1) return { sunrise: null, sunset: null } // the sun stays up
  const H = Math.acos(cosH) / RAD
  const toMs = (jd: number) => (jd - 2440587.5) * 86400000
  return { sunrise: hm(toMs(transit - H / 360), tz), sunset: hm(toMs(transit + H / 360), tz) }
}

/** Minutes since midnight for an HH:MM string (handy for comparing times). */
export const minutesOfDay = (t: string): number => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
