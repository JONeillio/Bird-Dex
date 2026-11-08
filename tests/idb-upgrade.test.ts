// P3: a phone with the version 2 database (sightings and import history) opens at version 3 and loses nothing.
import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { describe, expect, it } from 'vitest'
import { idbStorage } from '../src/data/personal/storage'

const enc = { id: 'enc00001', speciesId: 'european-robin', date: '2026-11-01', place: 'x', mode: 'seen', notes: '', photo: null, createdAt: '2026-11-01T10:00:00Z' }
const batch = { id: 'imp-1', source: 'ebird', fileName: 'f.csv', rowCount: 1, importedCount: 1, date: '2026-11-08T10:00:00Z' }

describe('IndexedDB version 3', () => {
  it('keeps version 2 sightings and imports, and adds a working game store', async () => {
    const old = await openDB('birdquest', 2, {
      upgrade(d) {
        d.createObjectStore('encounters', { keyPath: 'id' })
        d.createObjectStore('importBatches', { keyPath: 'id' })
      },
    })
    await old.put('encounters', enc)
    await old.put('importBatches', batch)
    old.close()

    const s = await idbStorage()
    expect((await s.loadAll()).map((e) => e.id)).toEqual(['enc00001'])
    expect((await s.loadBatches()).map((b) => b.id)).toEqual(['imp-1'])
    expect(await s.loadGame()).toEqual([])
    await s.putGame({ id: 'opened', keys: ['a'] })
    await s.putGameMany([{ id: 'note:a', text: 'hi' }])
    expect((await s.loadGame()).map((d) => d.id).sort()).toEqual(['note:a', 'opened'])
    await s.removeGame('note:a')
    expect((await s.loadGame()).map((d) => d.id)).toEqual(['opened'])
  })

  it('skips a damaged game document instead of failing', async () => {
    const raw = await openDB('birdquest', 3)
    await raw.put('game', { id: 'opened', keys: 'broken' })
    await raw.put('game', { id: 'note:z', text: 'fine' })
    raw.close()
    const s = await idbStorage()
    expect((await s.loadGame()).map((d) => d.id).sort()).toEqual(['note:z'])
  })
})
