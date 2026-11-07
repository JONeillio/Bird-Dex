import type { BirdPalette, DexSpecies } from '../../data/schema'
import { pixelsToCanvas, silhouettePixels, spritePixels, type Palette, type SpritePixels } from '../pixel'
import { GRID, renderBirdGrid } from './shape'

export const OUTLINE = '#1a1410'
export const EYE = '#14110f'
export const SILHOUETTE = '#8e938a'

/** Fill gaps so a species only needs the colours that matter. */
export function resolvePalette(p: BirdPalette): Palette {
  const back = p.back ?? '#8a7a6a'
  const cap = p.cap ?? back
  const breast = p.breast ?? p.belly ?? back
  const wing = p.wing ?? back
  return {
    o: OUTLINE,
    e: EYE,
    b: back,
    w: wing,
    h: cap,
    c: p.cheek ?? cap,
    n: p.neck ?? cap,
    t: breast,
    u: p.belly ?? breast,
    k: p.bill ?? '#3a2e28',
    l: p.legs ?? '#6b4e3a',
    x: p.tail ?? wing,
  }
}

const cache = new Map<string, SpritePixels>()

/** 32x32 placeholder pixels for a species (draw at integer scale 2 for the 64 px portrait size). */
export function placeholderPixels(s: DexSpecies, silhouette = false): SpritePixels {
  const key = `${s.id}|${silhouette}`
  const hit = cache.get(key)
  if (hit) return hit
  const px = spritePixels(renderBirdGrid(s.art.template, s.art.tweak), resolvePalette(s.art.palette))
  const out = silhouette ? silhouettePixels(px, SILHOUETTE) : px
  cache.set(key, out)
  return out
}

export const PLACEHOLDER_SIZE = GRID

const urlCache = new Map<string, string>()

/** 64x64 data URL (32 grid at 2x) for <img>. Browser only. */
export function placeholderDataUrl(s: DexSpecies, silhouette = false): string {
  const key = `${s.id}|${silhouette}`
  const hit = urlCache.get(key)
  if (hit) return hit
  const url = pixelsToCanvas(placeholderPixels(s, silhouette), 2).toDataURL('image/png')
  urlCache.set(key, url)
  return url
}
