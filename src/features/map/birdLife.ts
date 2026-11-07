// Decorative bird sprites: a couple of birds hop around each birding site, and now and then one flies
// to a nearby site. They show "reported here recently", not live positions (the site sheet says so).
// No sprites move when the phone asks for reduced motion.
import * as maplibregl from 'maplibre-gl'
import type { LngLat } from '../../data/published-schema'

export interface LifeSite {
  id: string
  point: LngLat
  /** Image sources of birds reported at this site (portrait or placeholder). */
  birds: string[]
}

const MAX_HOP_SITES = 24
const MAX_FLYERS = 3

export class BirdLife {
  private hoppers: maplibregl.Marker[] = []
  private flyers = new Set<{ marker: maplibregl.Marker; raf: number }>()
  private sites: LifeSite[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private readonly reduced: boolean
  private map: maplibregl.Map
  private onTap: (siteId: string) => void

  constructor(map: maplibregl.Map, onTap: (siteId: string) => void) {
    this.map = map
    this.onTap = onTap
    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  setSites(sites: LifeSite[]): void {
    this.hoppers.forEach((m) => m.remove())
    this.hoppers = []
    this.sites = sites.filter((s) => s.birds.length > 0)
    this.sites.slice(0, MAX_HOP_SITES).forEach((site, si) => {
      site.birds.slice(0, 2).forEach((src, bi) => {
        const angle = (si * 2.4 + bi * Math.PI + 0.6) % (Math.PI * 2)
        const r = 30 + ((si + bi) % 3) * 6
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'bird-sprite hop'
        el.tabIndex = -1
        el.setAttribute('aria-hidden', 'true')
        el.style.setProperty('--delay', `${((si * 7 + bi * 3) % 10) / 5}s`)
        el.style.setProperty('--dur', `${1.6 + ((si + bi) % 4) * 0.35}s`)
        if (Math.cos(angle) < 0) el.classList.add('flip')
        el.innerHTML = `<img src="${src}" width="30" height="30" alt="" draggable="false">`
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          this.onTap(site.id)
        })
        const m = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [Math.round(Math.cos(angle) * r), Math.round(Math.sin(angle) * r * 0.6)] })
          .setLngLat(site.point)
          .addTo(this.map)
        this.hoppers.push(m)
      })
    })
    if (!this.reduced && !this.timer) this.timer = setInterval(() => this.launch(), 2600)
  }

  private launch(): void {
    if (this.flyers.size >= MAX_FLYERS || this.sites.length < 2 || document.hidden) return
    const a = this.sites[Math.floor(Math.random() * Math.min(this.sites.length, MAX_HOP_SITES))]
    const near = this.sites
      .filter((s) => s !== a)
      .map((s) => ({ s, d: Math.hypot(s.point[0] - a.point[0], s.point[1] - a.point[1]) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 4)
    const b = near[Math.floor(Math.random() * near.length)]?.s
    if (!b) return
    const pa = this.map.project(a.point)
    const pb = this.map.project(b.point)
    const px = Math.hypot(pb.x - pa.x, pb.y - pa.y)
    if (px < 40 || px > 900) return // too close to notice, or off screen
    const src = a.birds[Math.floor(Math.random() * a.birds.length)]
    const el = document.createElement('div')
    el.className = 'bird-sprite fly'
    if (pb.x < pa.x) el.classList.add('flip')
    el.innerHTML = `<img src="${src}" width="30" height="30" alt="" draggable="false">`
    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(a.point).addTo(this.map)
    const dur = Math.min(7000, Math.max(2500, px * 9))
    const t0 = performance.now()
    const entry = { marker, raf: 0 }
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      marker.setLngLat([a.point[0] + (b.point[0] - a.point[0]) * e, a.point[1] + (b.point[1] - a.point[1]) * e])
      marker.setOffset([0, -Math.round(Math.sin(Math.PI * t) * Math.min(70, px * 0.25)) - 18])
      if (t < 1) entry.raf = requestAnimationFrame(step)
      else {
        el.classList.add('landed')
        setTimeout(() => {
          marker.remove()
          this.flyers.delete(entry)
        }, 1400)
      }
    }
    entry.raf = requestAnimationFrame(step)
    this.flyers.add(entry)
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.hoppers.forEach((m) => m.remove())
    this.flyers.forEach((f) => {
      cancelAnimationFrame(f.raf)
      f.marker.remove()
    })
    this.flyers.clear()
  }
}
