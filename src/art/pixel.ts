/**
 * pixelSprite: draw small pixel art from text grids.
 * Each character in a grid row is one pixel. '.' is transparent; any other
 * character must exist in the palette (a #RRGGBB hex colour).
 */

export type Palette = Record<string, string>

export interface SpritePixels {
  width: number
  height: number
  /** RGBA, row-major, length = width * height * 4 */
  data: Uint8ClampedArray
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error(`Bad colour "${hex}": expected #RRGGBB`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Pure conversion (no DOM), so it can be unit tested in node. */
export function spritePixels(grid: readonly string[], palette: Palette): SpritePixels {
  if (grid.length === 0) throw new Error('Empty sprite grid')
  const width = grid[0].length
  if (width === 0) throw new Error('Empty sprite row')
  const height = grid.length
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    const row = grid[y]
    if (row.length !== width) {
      throw new Error(`Row ${y} has width ${row.length}, expected ${width}`)
    }
    for (let x = 0; x < width; x++) {
      const ch = row[x]
      if (ch === '.') continue
      const colour = palette[ch]
      if (colour === undefined) throw new Error(`Unknown palette key "${ch}" at row ${y}, col ${x}`)
      const [r, g, b] = hexToRgb(colour)
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
  return { width, height, data }
}

/** Convert every opaque pixel to one colour (used for silhouettes). */
export function silhouettePixels(src: SpritePixels, colour: string): SpritePixels {
  const [r, g, b] = hexToRgb(colour)
  const data = new Uint8ClampedArray(src.data)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
    }
  }
  return { width: src.width, height: src.height, data }
}

/** Draw pixels to a canvas, scaled by an integer factor (nearest neighbour). */
export function pixelsToCanvas(px: SpritePixels, scale = 1): HTMLCanvasElement {
  if (!Number.isInteger(scale) || scale < 1) throw new Error('scale must be a positive integer')
  const small = document.createElement('canvas')
  small.width = px.width
  small.height = px.height
  const sctx = small.getContext('2d')
  if (!sctx) throw new Error('Canvas not available')
  sctx.putImageData(new ImageData(px.data as Uint8ClampedArray<ArrayBuffer>, px.width, px.height), 0, 0)
  if (scale === 1) return small
  const big = document.createElement('canvas')
  big.width = px.width * scale
  big.height = px.height * scale
  const bctx = big.getContext('2d')
  if (!bctx) throw new Error('Canvas not available')
  bctx.imageSmoothingEnabled = false
  bctx.drawImage(small, 0, 0, big.width, big.height)
  return big
}

export function pixelSprite(grid: readonly string[], palette: Palette, scale = 1): HTMLCanvasElement {
  return pixelsToCanvas(spritePixels(grid, palette), scale)
}

const urlCache = new Map<string, string>()

/** Data URL for use in <img> and map.addImage-style APIs. Cached by content. */
export function spriteDataUrl(grid: readonly string[], palette: Palette, scale = 1): string {
  const key = `${scale}|${JSON.stringify(palette)}|${grid.join('/')}`
  const hit = urlCache.get(key)
  if (hit) return hit
  const url = pixelSprite(grid, palette, scale).toDataURL('image/png')
  urlCache.set(key, url)
  return url
}
