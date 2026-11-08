import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { DRAFT_PORTRAITS } from '../src/art/portraits'
import { STARTER_DEX } from '../src/data/catalogue'

// Reads PNG width/height from the IHDR chunk, so no image library is needed.
function pngSize(path: string): [number, number] {
  const b = readFileSync(path)
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}

describe('portrait art files', () => {
  it('every real portrait id is a Starter Dex species and has a 64x64 sprite', () => {
    const ids = new Set(STARTER_DEX.map((s) => s.id))
    for (const id of DRAFT_PORTRAITS) {
      expect(ids.has(id), `${id} is not a Starter Dex id`).toBe(true)
      const path = `public/assets/birds/${id}/adult-portrait-draft.png`
      expect(existsSync(path), `${path} missing`).toBe(true)
      expect(pngSize(path)).toEqual([64, 64])
    }
    expect(DRAFT_PORTRAITS.size).toBeGreaterThanOrEqual(12)
  })
  it('the portrait list is a JSON file of unique Dex ids that the app reads as it is', () => {
    const listed = JSON.parse(readFileSync('src/art/draft-portraits.json', 'utf8')) as string[]
    expect(new Set(listed).size).toBe(listed.length)
    expect([...DRAFT_PORTRAITS].sort()).toEqual([...listed].sort())
  })
  it('map markers and scenery exist at their registered sizes', async () => {
    const { MAP_ART } = await import('../src/art/mapAssets')
    for (const [name, s] of Object.entries(MAP_ART)) {
      const path = 'public/' + s.src.replace('/Bird-Dex/', '')
      expect(existsSync(path), `${name}: ${path} missing`).toBe(true)
      expect(pngSize(path), name).toEqual([s.w, s.h])
    }
  })
})

describe('warden portraits and scenes', () => {
  it('every listed warden is a persona with a 96x96 portrait and a 192x192 @2x', async () => {
    const { PERSONAS, WARDEN_ART } = await import('../src/art/wardens')
    const ids = new Set(PERSONAS.map((p) => p.id))
    expect(ids.size).toBe(12)
    expect(WARDEN_ART.size).toBeGreaterThanOrEqual(4)
    for (const id of WARDEN_ART) {
      expect(ids.has(id), `${id} is not a persona`).toBe(true)
      expect(pngSize(`public/assets/wardens/warden_${id}.png`)).toEqual([96, 96])
      expect(pngSize(`public/assets/wardens/warden_${id}@2x.png`)).toEqual([192, 192])
    }
  })
  it('scenes exist at their registered sizes', async () => {
    const { SCENE_ART } = await import('../src/art/wardens')
    for (const s of Object.values(SCENE_ART)) {
      const file = (p: string) => 'public/' + p.replace(import.meta.env.BASE_URL, '')
      expect(pngSize(file(s.src))).toEqual([s.size, s.size])
      expect(pngSize(file(s.src2x))).toEqual([s.size * 2, s.size * 2])
    }
  })
})
