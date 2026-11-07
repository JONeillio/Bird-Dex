/**
 * Parametric placeholder birds: a bird is a handful of ellipses and segments drawn onto a 32x32 grid,
 * then given a bold dark outline. Twelve templates cover the Starter Dex; each species supplies colours
 * and a few tweaks (size, bill, tail, legs). Pure functions, no DOM, so it is unit tested in node.
 * Birds face right. Grid letters: o outline, b back, w wing, h cap, c cheek, n neck, t breast, u belly,
 * k bill, l legs, x tail, e eye.
 */
import type { TemplateId, Tweak } from '../../data/schema'

export const GRID = 32
const GROUND = 28
const rad = (d: number) => (d * Math.PI) / 180

interface Shape {
  body: { x: number; y: number; rx: number; ry: number; tilt: number }
  head: { x: number; y: number; r: number }
  neck?: { w: number }
  bill: { len: number; th: number; hook?: boolean }
  tail: { len: number; w: number; ang: number }
  legs: { gap: number; dx: number }
  wing: { rx: number; ry: number }
}

const T = (body: Shape['body'], head: Shape['head'], bill: Shape['bill'], tail: Shape['tail'], legs: Shape['legs'], wing: Shape['wing'], neck?: Shape['neck']): Shape => ({ body, head, bill, tail, legs, wing, neck })

export const TEMPLATE_SHAPES: Record<TemplateId, Shape> = {
  songbird: T({ x: 15, y: 18, rx: 7.5, ry: 6, tilt: 18 }, { x: 21.5, y: 12, r: 4 }, { len: 3, th: 2 }, { len: 7, w: 3, ang: 25 }, { gap: 3, dx: 0 }, { rx: 5, ry: 3 }),
  tit: T({ x: 15, y: 19, rx: 6, ry: 5.5, tilt: 10 }, { x: 20.5, y: 13.5, r: 4.2 }, { len: 2, th: 1.5 }, { len: 5, w: 2.5, ang: 25 }, { gap: 3, dx: 0 }, { rx: 4, ry: 2.5 }),
  thrush: T({ x: 14.5, y: 17.5, rx: 8.5, ry: 6.5, tilt: 28 }, { x: 22, y: 10.5, r: 4.3 }, { len: 4, th: 2 }, { len: 8, w: 3.5, ang: 35 }, { gap: 3.5, dx: 0 }, { rx: 6, ry: 3.5 }),
  finch: T({ x: 15, y: 18.5, rx: 7, ry: 6.2, tilt: 15 }, { x: 21, y: 13, r: 4.4 }, { len: 2.5, th: 3 }, { len: 6, w: 3, ang: 25 }, { gap: 3, dx: 0 }, { rx: 5, ry: 3 }),
  duck: T({ x: 14, y: 20.5, rx: 10, ry: 5, tilt: 0 }, { x: 24.5, y: 14, r: 3.5 }, { len: 5, th: 2.5 }, { len: 3, w: 3, ang: 10 }, { gap: 4, dx: -1 }, { rx: 7, ry: 2.5 }, { w: 3 }),
  swan: T({ x: 13, y: 20, rx: 10, ry: 6.5, tilt: 12 }, { x: 25, y: 8, r: 3.2 }, { len: 4, th: 2 }, { len: 4, w: 4, ang: 10 }, { gap: 4, dx: -1 }, { rx: 7, ry: 3.5 }, { w: 3 }),
  heron: T({ x: 13, y: 14, rx: 7, ry: 4.5, tilt: 35 }, { x: 24.5, y: 5.5, r: 2.8 }, { len: 7, th: 2 }, { len: 5, w: 3, ang: 40 }, { gap: 3, dx: 1 }, { rx: 5, ry: 2.5 }, { w: 2 }),
  raptor: T({ x: 14, y: 16.5, rx: 8, ry: 6.5, tilt: 30 }, { x: 21, y: 10, r: 4.2 }, { len: 3, th: 3, hook: true }, { len: 9, w: 4, ang: 35 }, { gap: 3, dx: 0 }, { rx: 7, ry: 4.5 }),
  woodpecker: T({ x: 13, y: 17, rx: 7, ry: 5.5, tilt: 40 }, { x: 20, y: 10, r: 4 }, { len: 5, th: 2 }, { len: 7, w: 3, ang: 55 }, { gap: 2.5, dx: 0 }, { rx: 5, ry: 3 }),
  kingfisher: T({ x: 14, y: 18.5, rx: 6.5, ry: 5.5, tilt: 12 }, { x: 20.5, y: 12.5, r: 5 }, { len: 8, th: 3 }, { len: 4, w: 3, ang: 20 }, { gap: 3, dx: 0 }, { rx: 5, ry: 3 }),
  gull: T({ x: 14, y: 17.5, rx: 9, ry: 5.5, tilt: 12 }, { x: 22.5, y: 11, r: 3.8 }, { len: 4, th: 2 }, { len: 5, w: 3, ang: 15 }, { gap: 3, dx: 0 }, { rx: 7, ry: 3 }),
  pigeon: T({ x: 14, y: 18.5, rx: 8.5, ry: 6.5, tilt: 15 }, { x: 21.5, y: 12.5, r: 4 }, { len: 3, th: 2 }, { len: 8, w: 3.5, ang: 20 }, { gap: 3, dx: 0 }, { rx: 6, ry: 3.5 }),
}

type Pt = { x: number; y: number }

function local(p: Pt, e: { x: number; y: number; rx: number; ry: number; tilt: number }) {
  const t = rad(e.tilt)
  const dx = p.x - e.x
  const dy = p.y - e.y
  return { s: (dx * Math.cos(t) - dy * Math.sin(t)) / e.rx, v: (dx * Math.sin(t) + dy * Math.cos(t)) / e.ry }
}

/** Distance from p to segment ab, and the 0..1 position of the closest point. */
function seg(p: Pt, a: Pt, b: Pt) {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const len2 = abx * abx + aby * aby || 1
  const u = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2))
  return { d: Math.hypot(p.x - (a.x + abx * u), p.y - (a.y + aby * u)), u }
}

export function renderBirdGrid(template: TemplateId, tweak: Tweak = {}): string[] {
  const base = TEMPLATE_SHAPES[template]
  let scale = tweak.scale ?? 1
  const lift = tweak.legs ?? 0
  const body = { ...base.body, y: base.body.y - lift }
  let head = { ...base.head, y: base.head.y - lift, r: base.head.r + (tweak.head ?? 0) }
  const tt = rad(body.tilt)
  const axis = { x: Math.cos(tt), y: -Math.sin(tt) }
  const perp = { x: Math.sin(tt), y: Math.cos(tt) }
  const front: Pt = { x: body.x + axis.x * body.rx * 0.7 - perp.x * body.ry * 0.1, y: body.y + axis.y * body.rx * 0.7 - perp.y * body.ry * 0.1 }
  const neckTweak = tweak.neck ?? 0
  if (neckTweak !== 0) head = { ...head, x: front.x + (head.x - front.x) * (1 + 0.15 * neckTweak), y: front.y + (head.y - front.y) * (1 + 0.15 * neckTweak) }
  const bill = { ...base.bill, len: Math.max(1, base.bill.len + (tweak.bill ?? 0)) }
  const tail = { ...base.tail, len: Math.max(1, base.tail.len + (tweak.tail ?? 0)), ang: tweak.tailAng ?? base.tail.ang }
  const crest = tweak.crest ?? 0

  const rear: Pt = { x: body.x - axis.x * body.rx * 0.8, y: body.y - axis.y * body.rx * 0.8 }
  const tailEnd: Pt = { x: rear.x - Math.cos(rad(tail.ang)) * tail.len, y: rear.y + Math.sin(rad(tail.ang)) * tail.len }
  const legTop = body.y + body.ry * 0.5
  const legX = [body.x + base.legs.dx - base.legs.gap / 2, body.x + base.legs.dx + base.legs.gap / 2]
  const wingC: Pt = { x: body.x - axis.x * body.rx * 0.1 - perp.x * body.ry * 0.2, y: body.y - axis.y * body.rx * 0.1 - perp.y * body.ry * 0.2 }
  const wing = { x: wingC.x, y: wingC.y, rx: base.wing.rx, ry: base.wing.ry, tilt: body.tilt - 8 }
  const billBase: Pt = { x: head.x + head.r * 0.8, y: head.y + head.r * 0.15 }
  const crestDir = { x: -0.7, y: -0.7 }
  const crestA: Pt = { x: head.x + crestDir.x * (head.r - 0.5), y: head.y + crestDir.y * (head.r - 0.5) }
  const crestB: Pt = { x: head.x + crestDir.x * (head.r + crest), y: head.y + crestDir.y * (head.r + crest) }

  /** Draw the bird; `ox` slides the whole bird left (+) or right (-) by ox grid pixels. */
  const draw = (ox: number): string[][] => {
  const grid: string[][] = Array.from({ length: GRID }, () => Array<string>(GRID).fill('.'))

  for (let py = 1; py < GRID - 1; py++) {
    for (let px = 1; px < GRID - 1; px++) {
      const p: Pt = { x: GRID / 2 + (px + 0.5 - GRID / 2 + ox) / scale, y: GROUND + (py + 0.5 - GROUND) / scale }
      let ch = '.'

      // back-to-front: legs, tail, neck, body, wing, head, bill
      for (const lx of legX) {
        if (Math.abs(p.x - lx) <= 0.6 && p.y >= legTop && p.y < GROUND) ch = 'l'
        if (p.y >= GROUND - 1 && p.y < GROUND && p.x >= lx - 1 && p.x <= lx + 2.5) ch = 'l'
      }
      const ts = seg(p, rear, tailEnd)
      if (ts.d <= (tail.w / 2) * (1 - 0.4 * ts.u)) ch = 'x'
      if (base.neck) {
        const ns = seg(p, front, { x: head.x, y: head.y })
        if (ns.d <= (base.neck.w + (neckTweak < 0 ? 0 : 0)) / 2) ch = 'n'
      }
      const bl = local(p, body)
      if (bl.s * bl.s + bl.v * bl.v <= 1) {
        ch = 'b'
        if (bl.v > 0.3) ch = 'u'
        if (bl.s > 0.3 && bl.v > -0.4) ch = 't'
        const wl = local(p, wing)
        if (wl.s * wl.s + wl.v * wl.v <= 1) ch = 'w'
      }
      const dx = p.x - head.x
      const dy = p.y - head.y
      if (dx * dx + dy * dy <= head.r * head.r) ch = dy > 0.15 * head.r ? 'c' : 'h'
      if (crest > 0 && seg(p, crestA, crestB).d <= 0.8) ch = 'h'
      const bx = p.x - billBase.x
      if (bx >= -0.5 && bx <= bill.len) {
        const u = Math.max(0, bx) / bill.len
        const centre = billBase.y + 0.1 * bx
        if (Math.abs(p.y - centre) <= (bill.th / 2) * (1 - 0.6 * u) + 0.1) ch = 'k'
        if (bill.hook && bx >= bill.len - 1.2 && p.y > centre && p.y <= centre + bill.th / 2 + 1.4) ch = 'k'
      }
      grid[py][px] = ch
    }
  }

  // eye
  const ex = Math.floor(GRID / 2 + (head.x + head.r * 0.38 - GRID / 2) * scale - ox)
  const ey = Math.floor(GROUND + (head.y - head.r * 0.18 - GROUND) * scale)
  if (ex > 0 && ex < GRID - 1 && ey > 0 && ey < GRID - 1 && 'hc'.includes(grid[ey][ex])) grid[ey][ex] = 'e'

  return grid
  }

  // Slide the bird until it sits inside the margin (a clipped pass under-measures, so iterate).
  // If it is simply too wide, shrink it a little and try again.
  let grid: string[][] = []
  for (let attempt = 0; attempt < 8; attempt++) {
    let shift = 0
    grid = draw(shift)
    let fits = false
    for (let i = 0; i < 6; i++) {
      const xs = grid.flatMap((r) => r.map((c, x) => (c === '.' ? -1 : x))).filter((x) => x >= 0)
      const maxX = Math.max(...xs)
      const minX = Math.min(...xs)
      if (maxX <= GRID - 3 && minX >= 2) {
        fits = true
        break
      }
      if (maxX > GRID - 3 && minX < 2) break // too wide, shrink
      shift += maxX > GRID - 3 ? maxX - (GRID - 3) : minX - 2
      grid = draw(shift)
    }
    if (fits) break
    scale *= 0.94
  }

  // bold outline: any empty cell that touches a filled cell (4-neighbour)
  const out = grid.map((r) => r.slice())
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (grid[y][x] !== '.') continue
      if ((y > 0 && grid[y - 1][x] !== '.') || (y < GRID - 1 && grid[y + 1][x] !== '.') || (x > 0 && grid[y][x - 1] !== '.') || (x < GRID - 1 && grid[y][x + 1] !== '.')) out[y][x] = 'o'
    }
  }
  return out.map((r) => r.join(''))
}
