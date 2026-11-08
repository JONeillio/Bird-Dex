import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { NPCS, npcArt } from '../src/art/npcs'

describe('NPC portraits', () => {
  it('has a runtime portrait and @2x for every NPC, with the right sizes', () => {
    for (const n of NPCS) {
      for (const [file, size] of [[`${n.id}.png`, 256], [`${n.id}@2x.png`, 512]] as const) {
        const p = `public/assets/npcs/${file}`
        expect(existsSync(p), p).toBe(true)
        const b = readFileSync(p)
        expect([b.readUInt32BE(16), b.readUInt32BE(20)], p).toEqual([size, size])
      }
      expect(existsSync(`research/art-drafts/npc-pack-v1/${n.id}.png`)).toBe(true)
    }
  })
  it('lists twelve distinct ids and returns null for unknown ones', () => {
    expect(new Set(NPCS.map((n) => n.id)).size).toBe(12)
    expect(npcArt('nobody')).toBeNull()
    expect(npcArt('val')?.src).toContain('assets/npcs/val.png')
  })
  it('keeps the public repo free of postcodes and street addresses in the pack notes', () => {
    for (const f of ['README.md', 'encounters.json']) {
      expect(readFileSync(`research/art-drafts/npc-pack-v1/${f}`, 'utf8')).not.toMatch(/DA8|Northumberland/)
    }
  })
})

describe('NPC expressions and map sprites', () => {
  const dims = (p: string): [number, number] => {
    const b = readFileSync(p)
    return [b.readUInt32BE(16), b.readUInt32BE(20)]
  }
  it('has talk and delight portraits (256 and @2x 512) with 1254 px masters for every NPC', async () => {
    const { EXPRESSIONS, npcArt } = await import('../src/art/npcs')
    expect(EXPRESSIONS).toEqual(['neutral', 'talk', 'delight'])
    for (const n of NPCS) {
      for (const e of EXPRESSIONS) {
        const a = npcArt(n.id, e)!
        for (const [src, size] of [[a.src, 256], [a.src2x, 512]] as const) {
          const p = 'public/' + src.replace(/^.*?assets\//, 'assets/')
          expect(existsSync(p), p).toBe(true)
          expect(dims(p), p).toEqual([size, size])
        }
        if (e !== 'neutral') expect(dims(`research/art-drafts/game-art/set-c-portrait-expressions/${n.id}_${e}.png`)).toEqual([1254, 1254])
      }
    }
    expect(npcArt('val', 'talk')?.src).toContain('val_talk.png')
    expect(npcArt('val')?.src).toMatch(/val\.png$/)
  })
  it('has a 4-frame 48x64 map strip per NPC with the feet anchor on the bottom centre', async () => {
    const { npcMapSprite } = await import('../src/art/npcs')
    for (const n of NPCS) {
      const s = npcMapSprite(n.id)!
      const p = 'public/' + s.src.replace(/^.*?assets\//, 'assets/')
      expect(dims(p), p).toEqual([s.frameW * s.frames, s.frameH])
      expect(s.anchor).toEqual({ x: s.frameW / 2, y: s.frameH })
      expect(s.action.length).toBeGreaterThan(3)
      expect(existsSync(`research/art-drafts/game-art/set-b-npc-map-sprites/${n.id}_map.png`)).toBe(true)
    }
    expect(npcMapSprite('nobody')).toBeNull()
  })
})

describe('Reserve Warden art (all twelve)', () => {
  it('every persona has a 96 px portrait and a 192 px @2x, plus the silhouette', async () => {
    const { PERSONAS, wardenArt, WARDEN_SILHOUETTE } = await import('../src/art/wardens')
    const dims = (p: string): [number, number] => {
      const b = readFileSync(p)
      return [b.readUInt32BE(16), b.readUInt32BE(20)]
    }
    expect(PERSONAS.length).toBe(12)
    for (const p of PERSONAS) {
      const a = wardenArt(p.id)
      expect(a, p.id).not.toBeNull()
      for (const [src, size] of [[a!.src, 96], [a!.src2x, 192]] as const) {
        const f = 'public/' + src.replace(/^.*?assets\//, 'assets/')
        expect(existsSync(f), f).toBe(true)
        expect(dims(f), f).toEqual([size, size])
      }
    }
    expect(dims('public/' + WARDEN_SILHOUETTE.src.replace(/^.*?assets\//, 'assets/'))).toEqual([96, 96])
    expect(wardenArt('nobody')).toBeNull()
  })
})
