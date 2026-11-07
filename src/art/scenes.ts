/**
 * Habitat backdrops for the bird profile: small procedural pixel scenes (48x28), drawn big and chunky.
 * Pure grid builder (tested) plus a browser-only data URL helper.
 */
import type { SetId } from '../data/schema'
import { pixelsToCanvas, spritePixels, type Palette } from './pixel'

export const SCENE_W = 48
export const SCENE_H = 28

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

interface SceneDef {
  palette: Palette
  build: (g: string[][], r: () => number) => void
}

const fillRows = (g: string[][], from: number, to: number, ch: string) => {
  for (let y = from; y < to; y++) g[y].fill(ch)
}

const SCENES: Record<'garden' | 'woodland' | 'wetland' | 'coast' | 'hills', SceneDef> = {
  garden: {
    palette: { s: '#bfe3ee', c: '#e9f5f6', t: '#4f8a4f', T: '#3d6f43', g: '#a8c97a', G: '#93b866', f: '#e8b24a', p: '#d9718a', f2: '#fffbef' },
    build: (g, r) => {
      fillRows(g, 0, 17, 's')
      for (let i = 0; i < 4; i++) { const x = Math.floor(r() * 40), y = 2 + Math.floor(r() * 6); for (let k = 0; k < 5; k++) g[y][x + k] = 'c'; for (let k = 1; k < 4; k++) g[y - 1][x + k] = 'c' }
      for (let x = 0; x < SCENE_W; x++) { const h = 3 + Math.floor(Math.sin(x / 3) * 1.5 + r() * 2); for (let y = 17 - h; y < 17; y++) g[y][x] = y === 17 - h ? 'T' : 't' }
      fillRows(g, 17, SCENE_H, 'g')
      for (let i = 0; i < 40; i++) g[18 + Math.floor(r() * 10)][Math.floor(r() * SCENE_W)] = 'G'
      for (let i = 0; i < 10; i++) g[20 + Math.floor(r() * 7)][Math.floor(r() * SCENE_W)] = i % 2 ? 'f' : 'p'
    },
  },
  woodland: {
    palette: { s: '#cfe5d0', t: '#3f7a4a', T: '#2f5f3a', L: '#6fae5a', b: '#6b4e3a', g: '#8aa860', G: '#6f8f4e', l: '#c8923a' },
    build: (g, r) => {
      fillRows(g, 0, 22, 's')
      for (let i = 0; i < 9; i++) {
        const x = 2 + i * 5 + Math.floor(r() * 2)
        for (let y = 8; y < 22; y++) g[y][x] = 'b'
        for (let y = 1; y < 11; y++) for (let dx = -3; dx <= 3; dx++) { const w = 3 - Math.abs(y - 6) * 0.5; if (Math.abs(dx) <= w && x + dx >= 0 && x + dx < SCENE_W) g[y][x + dx] = (y + dx) % 3 === 0 ? 'L' : (i % 2 ? 't' : 'T') }
      }
      fillRows(g, 22, SCENE_H, 'g')
      for (let i = 0; i < 40; i++) g[22 + Math.floor(r() * 6)][Math.floor(r() * SCENE_W)] = i % 5 === 0 ? 'l' : 'G'
    },
  },
  wetland: {
    palette: { s: '#cfe8ef', c: '#f3fafb', w: '#7db8c6', W: '#a9d4de', d: '#438ca8', e: '#8a9a4a', E: '#6f7f3a', m: '#a8b878', k: '#b59a6a' },
    build: (g, r) => {
      fillRows(g, 0, 14, 's')
      for (let i = 0; i < 3; i++) { const x = Math.floor(r() * 40), y = 2 + Math.floor(r() * 5); for (let k = 0; k < 6; k++) g[y][x + k] = 'c' }
      fillRows(g, 14, 25, 'w')
      for (let i = 0; i < 26; i++) { const y = 15 + Math.floor(r() * 9), x = Math.floor(r() * 44); g[y][x] = 'W'; g[y][x + 1] = 'W'; g[y][x + 2] = 'W' }
      for (let x = 0; x < SCENE_W; x += 2) { if (r() < 0.75) { const h = 4 + Math.floor(r() * 5); for (let y = 14 - h; y < 15; y++) g[y][x] = y < 14 - h + 2 ? 'k' : 'e' } }
      for (let x = 0; x < SCENE_W; x++) { g[25][x] = 'm'; g[26][x] = 'm'; g[27][x] = r() < 0.3 ? 'E' : 'm' }
    },
  },
  coast: {
    palette: { s: '#d4ebf3', c: '#ffffff', w: '#5aa0b8', W: '#8fc4d4', f: '#f5fbfc', n: '#e8d9a8', N: '#d4c48c', r: '#8a8a7a' },
    build: (g, r) => {
      fillRows(g, 0, 12, 's')
      for (let i = 0; i < 4; i++) { const x = Math.floor(r() * 40), y = 2 + Math.floor(r() * 6); for (let k = 0; k < 6; k++) g[y][x + k] = 'c' }
      fillRows(g, 12, 21, 'w')
      for (let i = 0; i < 24; i++) { const y = 13 + Math.floor(r() * 7), x = Math.floor(r() * 42); g[y][x] = 'W'; g[y][x + 1] = 'W'; g[y][x + 2] = 'W' }
      for (let x = 0; x < SCENE_W; x++) { g[21][x] = 'f'; g[22][x] = x % 3 === 0 ? 'f' : 'n' }
      fillRows(g, 23, SCENE_H, 'n')
      for (let i = 0; i < 24; i++) g[23 + Math.floor(r() * 5)][Math.floor(r() * SCENE_W)] = i % 4 === 0 ? 'r' : 'N'
    },
  },
  hills: {
    palette: { s: '#cde6ef', c: '#ffffff', h: '#a9c58a', H: '#8bb06a', p: '#c9d9a0', q: '#9fbd7a', w: '#9a9588', g: '#93b866', G: '#7ea558' },
    build: (g, r) => {
      fillRows(g, 0, 20, 's')
      for (let i = 0; i < 4; i++) { const x = Math.floor(r() * 38), y = 2 + Math.floor(r() * 6); for (let k = 0; k < 7; k++) g[y][x + k] = 'c'; for (let k = 1; k < 6; k++) g[y - 1][x + k] = 'c' }
      for (let x = 0; x < SCENE_W; x++) { const top = 11 + Math.round(Math.sin(x / 6) * 2 + Math.sin(x / 2.3)); for (let y = top; y < 20; y++) g[y][x] = 'h' }
      for (let x = 0; x < SCENE_W; x++) { const top = 16 + Math.round(Math.sin(x / 4 + 2) * 1.5); for (let y = top; y < 22; y++) g[y][x] = 'H' }
      for (let y = 20; y < SCENE_H; y++) for (let x = 0; x < SCENE_W; x++) g[y][x] = (x + y * 2) % 7 < 3 ? 'g' : 'G'
      for (let x = 0; x < SCENE_W; x++) { g[21][x] = x % 4 === 0 ? 'w' : 'w'; if (x % 3) g[20][x] = 'w' }
    },
  },
}

export function sceneKey(habitat: SetId): keyof typeof SCENES {
  switch (habitat) {
    case 'garden': return 'garden'
    case 'woodland': return 'woodland'
    case 'wetland': return 'wetland'
    case 'coast': return 'coast'
    default: return 'hills' // farmland-upland and raptors
  }
}

export function sceneGrid(habitat: SetId): { grid: string[]; palette: Palette } {
  const def = SCENES[sceneKey(habitat)]
  const g: string[][] = Array.from({ length: SCENE_H }, () => Array<string>(SCENE_W).fill('s'))
  def.build(g, rng(habitat.length * 7919 + 17))
  return { grid: g.map((row) => row.join('')), palette: def.palette }
}

const cache = new Map<string, string>()
export function sceneDataUrl(habitat: SetId): string {
  const hit = cache.get(habitat)
  if (hit) return hit
  const { grid, palette } = sceneGrid(habitat)
  const url = pixelsToCanvas(spritePixels(grid, palette), 1).toDataURL('image/png')
  cache.set(habitat, url)
  return url
}
