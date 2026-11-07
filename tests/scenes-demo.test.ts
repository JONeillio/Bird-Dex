import { describe, expect, it } from 'vitest'
import { SCENE_H, SCENE_W, sceneGrid } from '../src/art/scenes'
import { spritePixels } from '../src/art/pixel'
import { DEMO_RECORDED_IDS } from '../src/data/demo'
import { dexById } from '../src/data/catalogue'
import { SETS } from '../src/data/schema'
import { recordedIds } from '../src/domain/collection'

describe('habitat scenes', () => {
  it.each(SETS)('%s scene is a full, rectangular 48x28 grid that its palette can draw', (h) => {
    const { grid, palette } = sceneGrid(h)
    expect(grid).toHaveLength(SCENE_H)
    grid.forEach((r) => expect(r).toHaveLength(SCENE_W))
    expect(() => spritePixels(grid, palette)).not.toThrow()
  })
  it('is deterministic', () => {
    expect(sceneGrid('wetland').grid).toEqual(sceneGrid('wetland').grid)
  })
})

describe('demo collection', () => {
  it('lists 24 real Starter Dex species', () => {
    expect(DEMO_RECORDED_IDS).toHaveLength(24)
    for (const id of DEMO_RECORDED_IDS) expect(dexById(id), id).toBeDefined()
  })
  it('only counts as recorded when switched on; real records start empty', () => {
    expect(recordedIds({ demoCollection: false }).size).toBe(0)
    expect(recordedIds({ demoCollection: true }).size).toBe(24)
  })
})
