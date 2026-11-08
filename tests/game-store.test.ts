// P3: game documents, backup schema 2, and the IndexedDB upgrade to version 3.
import { describe, expect, it, beforeEach } from 'vitest'
import { buildBackup, parseBackup, planRestore } from '../src/domain/backup'
import { GameDocSchema, mergeGameDocs, openedKeysOf, validGameDocs, type GameDoc } from '../src/data/personal/game-schema'
import { memoryStorage } from '../src/data/personal/storage'
import type { Encounter, ImportBatch } from '../src/data/personal-schema'
import { useGame, prefsOf } from '../src/state/game'

const enc = (id: string): Encounter => ({ id, speciesId: 'european-robin', date: '2026-11-01', place: 'x', mode: 'seen', notes: '', photo: null, createdAt: '2026-11-01T10:00:00Z' })
const batch: ImportBatch = { id: 'imp-1', source: 'ebird', fileName: 'f.csv', rowCount: 2, importedCount: 2, date: '2026-11-08T10:00:00Z' }
const KNOWN = new Set(['european-robin'])

describe('game documents', () => {
  it('accept each kind and reject nonsense', () => {
    const good: unknown[] = [
      { id: 'opened', keys: ['2026-11-01|l123'] },
      { id: 'note:2026-11-01|l123', text: 'Cold and bright.' },
      { id: 'call:abc', wardenId: 'maud-location-1', siteId: 'L123', madeAt: '2026-11-08T10:00:00Z', expiresOn: '2026-11-15', player: [] },
      { id: 'npc:nell', choices: { q1: 'a' } },
      { id: 'npcHomes:location-1', homes: { nell: 'L123' } },
      { id: 'prefs', nicknames: { 'european-robin': 'Rob' }, lastNewsSeenAt: null, lastReportSeenAt: null, playerName: 'Jo' },
    ]
    for (const g of good) expect(GameDocSchema.safeParse(g).success, JSON.stringify(g)).toBe(true)
    for (const bad of [{ id: 'opened', keys: [1] }, { id: 'note:x', text: 'x'.repeat(501) }, { id: 'mystery' }, { id: 'prefs', nicknames: {} }]) expect(GameDocSchema.safeParse(bad).success).toBe(false)
  })

  it('a damaged document is skipped, not fatal', () => {
    const docs = validGameDocs([{ id: 'opened', keys: ['a'] }, { id: 'opened', keys: 'oops' }, null, 7, { id: 'note:k', text: 'ok' }])
    expect(docs.map((d) => d.id).sort()).toEqual(['note:k', 'opened'])
  })

  it('merging: the phone wins, the backup fills gaps, opened keys are joined', () => {
    const phone: GameDoc[] = [{ id: 'opened', keys: ['a', 'b'] }, { id: 'note:k', text: 'mine' }]
    const backup: GameDoc[] = [{ id: 'opened', keys: ['b', 'c'] }, { id: 'note:k', text: 'theirs' }, { id: 'note:j', text: 'new' }]
    const out = mergeGameDocs(phone, backup)
    expect([...openedKeysOf(out)].sort()).toEqual(['a', 'b', 'c'])
    expect(out.find((d) => d.id === 'note:k')).toMatchObject({ text: 'mine' })
    expect(out.find((d) => d.id === 'note:j')).toMatchObject({ text: 'new' })
  })
})

describe('backup schema 2', () => {
  it('round trip keeps encounters, import history and game documents', () => {
    const game: GameDoc[] = [{ id: 'opened', keys: ['k1'] }, { id: 'note:k1', text: 'hi' }]
    const text = JSON.stringify(buildBackup([enc('enc00001')], ['european-robin'], new Date('2026-11-08T12:00:00Z'), { importBatches: [batch], game }))
    const r = parseBackup(text)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.backup.schema).toBe(2)
    expect(r.backup.importBatches).toEqual([batch])
    expect(r.backup.game).toEqual(game)
  })

  it('a schema 1 backup still restores', () => {
    const old = { app: 'birdquest', schema: 1, exportedAt: '2026-11-01T00:00:00Z', encounters: [enc('enc00001')], targets: [] }
    const r = parseBackup(JSON.stringify(old))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const plan = planRestore([], [], r.backup, KNOWN)
    expect(plan.added).toBe(1)
    expect(plan.addedBatches).toEqual([])
    expect(plan.mergedGame).toEqual([])
  })

  it('a backup with a damaged game document still loads the rest', () => {
    const b = { ...buildBackup([], [], new Date()), game: [{ id: 'opened', keys: ['a'] }, { id: 'opened', keys: 5 }] }
    const r = parseBackup(JSON.stringify(b))
    expect(r.ok && r.backup.game).toEqual([{ id: 'opened', keys: ['a'] }])
  })

  it('restoring unions opened keys with the phone and adds only missing import history', () => {
    const b = buildBackup([enc('enc00001')], [], new Date(), { importBatches: [batch, { ...batch, id: 'imp-2' }], game: [{ id: 'opened', keys: ['b'] }] })
    const plan = planRestore([], [], b, KNOWN, { importBatches: [batch], game: [{ id: 'opened', keys: ['a'] }] })
    expect(plan.addedBatches.map((x) => x.id)).toEqual(['imp-2'])
    expect([...openedKeysOf(plan.mergedGame)].sort()).toEqual(['a', 'b'])
  })
})

describe('useGame', () => {
  beforeEach(async () => {
    await useGame.getState().load(memoryStorage())
  })
  it('keeps opened keys, notes, nicknames and NPC answers, and saves them to storage', async () => {
    const store = memoryStorage()
    await useGame.getState().load(store)
    await useGame.getState().markOpened(['a', 'b'])
    await useGame.getState().markOpened(['b', 'c'])
    await useGame.getState().setNote('a', '  Lovely morning  ')
    await useGame.getState().setNickname('european-robin', 'Rob')
    await useGame.getState().setNpcChoice('nell', 'q1', 'a')
    await useGame.getState().setNpcChoice('nell', 'q2', 'b')
    await useGame.getState().setNpcHomes('location-1', { nell: 'L123' })
    const s = useGame.getState()
    expect([...openedKeysOf(Object.values(s.docs))]).toEqual(['a', 'b', 'c'])
    expect(prefsOf(s.docs).nicknames).toEqual({ 'european-robin': 'Rob' })
    expect(s.docs['note:a']).toMatchObject({ text: 'Lovely morning' })
    expect(s.docs['npc:nell']).toMatchObject({ choices: { q1: 'a', q2: 'b' } })
    // Loaded again from the same storage, everything is still there.
    await useGame.getState().load(store)
    expect(Object.keys(useGame.getState().docs).sort()).toEqual(['note:a', 'npc:nell', 'npcHomes:location-1', 'opened', 'prefs'])
    await useGame.getState().setNote('a', '')
    await useGame.getState().setNickname('european-robin', '')
    expect(useGame.getState().docs['note:a']).toBeUndefined()
    expect(prefsOf(useGame.getState().docs).nicknames).toEqual({})
  })

  it('restore merges and saves only what changed', async () => {
    await useGame.getState().markOpened(['a'])
    await useGame.getState().restore([{ id: 'opened', keys: ['z'] }, { id: 'note:q', text: 'x' }])
    expect([...openedKeysOf(Object.values(useGame.getState().docs))].sort()).toEqual(['a', 'z'])
    expect(useGame.getState().docs['note:q']).toBeDefined()
  })
})
