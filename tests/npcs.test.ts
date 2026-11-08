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
