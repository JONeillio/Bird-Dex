import { useEffect, useMemo, useRef, useState } from 'react'
import { spriteDataUrl } from '../../art/pixel'
import { firstDelayMs, mayFly, nextDelayMs, planFlight, pointAt, wingFrame, type Flight } from '../../domain/flyby'
import { useReducedMotion } from '../../ui/dialogue/useReducedMotion'

// A distant bird seen from behind, two frames, drawn in code (no art file). 16x7, ink; shown at 45% opacity.
const WINGS_UP = [
  'oo............oo',
  '.oo..........oo.',
  '..oo........oo..',
  '...ooo....ooo...',
  '.....oooooo.....',
  '......oooo......',
  '.......oo.......',
]
const WINGS_LEVEL = [
  '................',
  '................',
  '......oooo......',
  '.oooooooooooooo.',
  'oo....oooo....oo',
  'o......oo......o',
  '................',
]
const PALETTE = { o: '#213b32' }

/**
 * Now and then a small bird (a pair, or in winter a little V of geese) flies across the map. Pure decoration:
 * no taps, hidden from screen readers, off with reduced motion or the Settings switch, and only when the map has
 * been left alone for a few seconds and nothing is open on top of it.
 */
export function FlyBy({ enabled, busy, cardH }: {
  enabled: boolean
  /** A sheet, tour or other overlay is open. */
  busy: boolean
  /** Height of the site card at the bottom of the map; birds keep above it. */
  cardH: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const birds = useRef<(HTMLImageElement | null)[]>([])
  const reduced = useReducedMotion()
  const [flight, setFlight] = useState<Flight | null>(null)
  const frames = useMemo(() => [spriteDataUrl(WINGS_UP, PALETTE), spriteDataUrl(WINGS_LEVEL, PALETTE)], [])
  const live = useRef({ enabled, busy, reduced, cardH })
  useEffect(() => {
    live.current = { enabled, busy, reduced, cardH }
  })
  const lastTouch = useRef(0)
  const launched = useRef(false)

  // Any touch or scroll on the map counts as "not still".
  useEffect(() => {
    const area = box.current?.parentElement
    if (!area) return
    const touched = () => (lastTouch.current = performance.now())
    touched()
    const opts = { capture: true, passive: true } as const
    for (const ev of ['pointerdown', 'pointermove', 'wheel', 'touchmove'] as const) area.addEventListener(ev, touched, opts)
    return () => {
      for (const ev of ['pointerdown', 'pointermove', 'wheel', 'touchmove'] as const) area.removeEventListener(ev, touched, opts)
    }
  }, [])

  // The schedule: wait, check the map is quiet, launch; if it isn't quiet, look again in 5 s.
  useEffect(() => {
    if (flight) return
    let timer = 0
    const tryLaunch = () => {
      const s = live.current
      const el = box.current
      const ok = el && mayFly({
        enabled: s.enabled,
        reducedMotion: s.reduced,
        visible: document.visibilityState === 'visible',
        busy: s.busy,
        stillForMs: performance.now() - lastTouch.current,
      })
      if (!ok || !el) {
        timer = window.setTimeout(tryLaunch, 5_000)
        return
      }
      const r = el.getBoundingClientRect()
      setFlight(planFlight(Math.random, { w: r.width, h: r.height, clearBottom: r.height - s.cardH - 8 }, new Date().getMonth() + 1))
    }
    timer = window.setTimeout(tryLaunch, launched.current ? nextDelayMs(Math.random) : firstDelayMs(Math.random))
    return () => window.clearTimeout(timer)
  }, [flight])

  // Fly: move the sprites each frame with transforms (no React renders), then land the flight.
  useEffect(() => {
    if (!flight) return
    launched.current = true
    const t0 = performance.now()
    const dir = flight.rightward ? 1 : -1
    const w = 16 * flight.scale
    const h = 7 * flight.scale
    let raf = 0
    const step = () => {
      const elapsed = performance.now() - t0
      const p = Math.min(1, elapsed / flight.durationMs)
      const lead = pointAt(flight, p)
      flight.flock.forEach((off, i) => {
        const img = birds.current[i]
        if (!img) return
        const x = lead.x - dir * off.x - w / 2
        const y = lead.y + off.y - h / 2
        img.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
        const f = wingFrame(p, elapsed + i * 55)
        if (img.dataset.f !== String(f)) {
          img.dataset.f = String(f)
          img.src = frames[f]
        }
      })
      // Stop early if something opens on top of the map or motion gets switched off.
      if (p >= 1 || live.current.busy || live.current.reduced || !live.current.enabled) setFlight(null)
      else raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [flight, frames])

  return (
    <div className="flyby" ref={box} aria-hidden>
      {flight?.flock.map((_, i) => (
        <img
          key={i}
          ref={(el) => {
            birds.current[i] = el
          }}
          src={frames[0]}
          width={16 * flight.scale}
          height={7 * flight.scale}
          alt=""
          draggable={false}
          style={{ transform: 'translate3d(-100px, -100px, 0)' }}
        />
      ))}
    </div>
  )
}
