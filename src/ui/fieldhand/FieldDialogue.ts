// Canvas renderer for Pearl's speech bubble, ported from the kit's dialogue-player.js (set-g-fieldhand-dialogue).
// Differences from the kit: TypeScript; letters fall from above before landing (see MOTION in layout.ts); the
// portrait can be a cel of a sprite sheet so the sketching pose can animate; a frame loop only runs while letters
// move and stops when the page settles.
import { BODY, CANVAS, METRICS, MOTION, glyphFor, layoutPages, letterPhase, pageDuration, scheduleLetters, type Letter } from './layout'

const { w: W, h: H } = CANVAS
const INK = '#213b32'
const GOLD = '#d8a84b'
const NAME_INK = '#fff9e8'

export interface Skin {
  body: HTMLImageElement
  tail: HTMLImageElement
}

export interface FieldhandResources {
  land: HTMLImageElement
  lock: HTMLImageElement
  skins: { paper: Skin; lifer: Skin }
}

export interface Portrait {
  image: CanvasImageSource
  /** Source rectangle (defaults to the whole 96x96 image). */
  sx?: number
  sy?: number
  size?: number
}

export interface Scene {
  text: string
  portrait: Portrait
  /** Mouth on the original 96x96 sprite, before mirroring. */
  mouth: [number, number]
  mirror?: boolean
  name?: string
  skin?: 'paper' | 'lifer'
  reducedMotion?: boolean
}

export interface DialogueState {
  done: boolean
  page: number
  pages: number
}

function surface(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  c.getContext('2d')!.imageSmoothingEnabled = false
  return c
}

/** Draw a 28x28 nine-slice with 7 px corners. */
function nine(ctx: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const sx = [0, 7, 21, 28]
  const dx = [x, x + 7, x + w - 7, x + w]
  const dy = [y, y + 7, y + h - 7, y + h]
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) ctx.drawImage(im, sx[i], sx[j], sx[i + 1] - sx[i], sx[j + 1] - sx[j], dx[i], dy[j], dx[i + 1] - dx[i], dy[j + 1] - dy[j])
}

export class FieldDialogue {
  private ctx: CanvasRenderingContext2D
  private base = surface()
  private fixed = surface()
  private scene: Scene | null = null
  private pages: string[][] = [[]]
  private page = 0
  private letters: Letter[] = []
  private locked = 0
  /** Letters that have started to fall (for the speech blips). */
  private fallen = 0
  /** Called as each letter starts to fall: the speech sound hangs off this. */
  onLetter?: (ch: string, index: number) => void
  private started = 0
  private frame = 0
  private timer = 0
  private done = true
  private onState?: (s: DialogueState) => void
  private r: FieldhandResources

  constructor(canvas: HTMLCanvasElement, r: FieldhandResources, onState?: (s: DialogueState) => void) {
    this.r = r
    canvas.width = W
    canvas.height = H
    this.ctx = canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false
    this.onState = onState
  }

  private stamp(ctx: CanvasRenderingContext2D, ch: string, state: 'land' | 'lock', x: number, y: number) {
    const g = glyphFor(ch)
    const [tw, th] = METRICS.tile
    ctx.drawImage(this.r[state], g.x, g.y, tw, th, Math.round(x) - METRICS.origin[0], Math.round(y) - METRICS.origin[1], tw, th)
  }

  /** Start a new line. Any line already playing stops. */
  say(scene: Scene) {
    this.stop()
    this.scene = scene
    this.pages = layoutPages(scene.text)
    this.page = 0
    this.preparePage()
  }

  /** Swap the portrait (e.g. the next sketching cel) without restarting the text. */
  setPortrait(portrait: Portrait) {
    if (!this.scene) return
    this.scene = { ...this.scene, portrait }
    this.renderBase()
    this.paint(performance.now() - this.started)
  }

  private renderBase() {
    const scene = this.scene!
    const g = this.base.getContext('2d')!
    g.clearRect(0, 0, W, H)
    const pic = { x: 229, y: 36, w: 127 }
    const [mouthX, mouthY] = scene.mouth
    const mx = Math.round(pic.x + ((scene.mirror ? 96 - mouthX : mouthX) * pic.w) / 96)
    const my = Math.round(pic.y + (mouthY * pic.w) / 96)
    const p = scene.portrait
    const s = p.size ?? 96
    g.save()
    if (scene.mirror) {
      g.translate(pic.x + pic.w, pic.y)
      g.scale(-1, 1)
      g.drawImage(p.image, p.sx ?? 0, p.sy ?? 0, s, s, 0, 0, pic.w, pic.w)
    } else g.drawImage(p.image, p.sx ?? 0, p.sy ?? 0, s, s, pic.x, pic.y, pic.w, pic.w)
    g.restore()
    const silhouette = g.getImageData(0, 0, W, H).data
    const skin = this.r.skins[scene.skin ?? 'paper']
    nine(g, skin.body, BODY.x, BODY.y, BODY.w, BODY.h)
    // The stepped tail leaves the body and aims at her mouth, stopping just before her outline.
    const left = BODY.x + BODY.w - 4
    const joinY = Math.max(BODY.y + 23, Math.min(my - 32, BODY.y + BODY.h - 24))
    const rayY = (x: number) => Math.round(joinY + 8 + ((my - joinY - 8) * (x - left)) / Math.max(1, mx - left))
    let tipX = mx - 6
    for (let x = left + 4; x < tipX; x++) {
      if (silhouette[(rayY(x) * W + x) * 4 + 3] > 127) {
        tipX = Math.max(left + 10, x - 3)
        break
      }
    }
    g.drawImage(skin.tail, left, joinY, tipX - left + 1, Math.max(13, rayY(tipX) - joinY + 1))
    // Name tab, lettered with the same bitmap font reversed out of the ink.
    const who = (scene.name ?? 'Pearl').toUpperCase()
    let tagW = 22
    for (const ch of who) tagW += glyphFor(ch).advance
    g.fillStyle = INK
    g.fillRect(BODY.x + 12, BODY.y - 7, tagW, 18)
    g.fillStyle = GOLD
    g.fillRect(BODY.x + 18, BODY.y - 2, 3, 9)
    const nc = document.createElement('canvas')
    nc.width = tagW
    nc.height = 18
    const ng = nc.getContext('2d')!
    ng.imageSmoothingEnabled = false
    let nx = 0
    for (const ch of who) {
      this.stamp(ng, ch, 'lock', nx, 1)
      nx += glyphFor(ch).advance
    }
    ng.globalCompositeOperation = 'source-in'
    ng.fillStyle = NAME_INK
    ng.fillRect(0, 0, tagW, 18)
    g.drawImage(nc, BODY.x + 26, BODY.y - 6)
  }

  private preparePage() {
    this.renderBase()
    this.fixed.getContext('2d')!.clearRect(0, 0, W, H)
    this.letters = scheduleLetters(this.pages[this.page] ?? [])
    this.locked = 0
    this.fallen = 0
    this.done = false
    this.started = performance.now()
    if (this.scene?.reducedMotion || this.letters.length === 0) this.finish()
    else {
      this.emit()
      this.loop()
    }
  }

  private loop = () => {
    const now = performance.now() - this.started
    // Stamp letters that have finished landing onto the fixed layer, so each frame only draws the moving few.
    const fg = this.fixed.getContext('2d')!
    while (this.fallen < this.letters.length && this.letters[this.fallen].t <= now) {
      this.onLetter?.(this.letters[this.fallen].ch, this.fallen)
      this.fallen++
    }
    while (this.locked < this.letters.length && letterPhase(this.letters[this.locked], now).state === 'locked') {
      const l = this.letters[this.locked++]
      this.stamp(fg, l.ch, 'lock', l.x, l.y)
    }
    this.paint(now)
    if (this.locked >= this.letters.length) {
      this.done = true
      this.emit()
      return
    }
    // Sleep through long pauses (punctuation) instead of drawing identical frames.
    const nextT = this.letters[this.locked].t
    if (nextT - now > 50) this.timer = window.setTimeout(() => (this.frame = requestAnimationFrame(this.loop)), nextT - now - 16)
    else this.frame = requestAnimationFrame(this.loop)
  }

  private paint(now: number) {
    const ctx = this.ctx
    ctx.clearRect(0, 0, W, H)
    ctx.drawImage(this.base, 0, 0)
    if (this.done) {
      ctx.drawImage(this.fixed, 0, 0)
      return
    }
    // Falling letters go behind the settled text and firm up in three steps as they drop, so a letter falling
    // past the line above never muddles it.
    const settled: Letter[] = []
    for (let i = this.locked; i < this.letters.length; i++) {
      const l = this.letters[i]
      const ph = letterPhase(l, now)
      if (ph.state === 'waiting') break
      if (ph.state === 'falling') {
        const left = ph.dy / MOTION.fallPx
        ctx.globalAlpha = left > 0.55 ? 0.35 : left > 0.2 ? 0.7 : 1
        this.stamp(ctx, l.ch, 'land', l.x, l.y - ph.dy)
      } else settled.push(l)
    }
    ctx.globalAlpha = 1
    ctx.drawImage(this.fixed, 0, 0)
    for (const l of settled) this.stamp(ctx, l.ch, letterPhase(l, now).state === 'landed' ? 'land' : 'lock', l.x, l.y)
  }

  private emit() {
    this.onState?.({ done: this.done, page: this.page, pages: this.pages.length })
  }

  /** Show the whole page at once. */
  finish() {
    this.stop()
    const fg = this.fixed.getContext('2d')!
    fg.clearRect(0, 0, W, H)
    for (const l of this.letters) this.stamp(fg, l.ch, 'lock', l.x, l.y)
    this.locked = this.letters.length
    this.fallen = this.letters.length
    this.done = true
    this.paint(Infinity)
    this.emit()
  }

  /** Tap behaviour: finish the page, else turn to the next page. False when the whole line has been shown. */
  advance(): boolean {
    if (!this.done) {
      this.finish()
      return true
    }
    if (this.page + 1 < this.pages.length) {
      this.page++
      this.preparePage()
      return true
    }
    return false
  }

  get pageMs(): number {
    return pageDuration(this.letters)
  }

  stop() {
    cancelAnimationFrame(this.frame)
    clearTimeout(this.timer)
  }

  destroy() {
    this.stop()
    this.onState = undefined
  }
}

let loading: Promise<FieldhandResources> | null = null

function img(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error(`Could not load ${src}`))
    i.src = src
  })
}

/** Load the font atlases and bubble skins once per page. */
export function loadFieldhand(): Promise<FieldhandResources> {
  if (!loading) {
    const b = import.meta.env.BASE_URL + 'assets/ui/fieldhand/'
    loading = Promise.all(
      ['fieldhand-land', 'fieldhand-lock', 'bubble-paper-9slice', 'bubble-paper-tail', 'bubble-lifer-9slice', 'bubble-lifer-tail'].map((f) => img(`${b}${f}.png`)),
    ).then(([land, lock, pb, pt, lb, lt]) => ({ land, lock, skins: { paper: { body: pb, tail: pt }, lifer: { body: lb, tail: lt } } }))
    loading.catch(() => (loading = null))
  }
  return loading
}

const portraits = new Map<string, Promise<HTMLImageElement>>()
export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = portraits.get(src)
  if (!p) {
    p = img(src)
    portraits.set(src, p)
    p.catch(() => portraits.delete(src))
  }
  return p
}
