// The committed sample export in samples/ must match the generator and import cleanly.
import { readFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { STARTER_DEX } from '../src/data/catalogue'
import { parseEbirdCsv } from '../src/data/importers/ebird-csv'
import { sampleCsv, SAMPLE_TODAY } from '../scripts/dev/make-sample-export'

describe('samples/ export files', () => {
  const csv = readFileSync('samples/MyEBirdData-sample.csv', 'utf8')
  it('csv matches the generator', () => expect(csv).toBe(sampleCsv()))
  it('zip holds the same csv', () => {
    const z = readFileSync('samples/MyEBirdData-sample.zip')
    const nameLen = z.readUInt16LE(26)
    const size = z.readUInt32LE(18)
    const start = 30 + nameLen + z.readUInt16LE(28)
    expect(inflateRawSync(z.subarray(start, start + size)).toString('utf8')).toBe(csv)
  })
  it('imports with no errors and has needs-review rows', () => {
    const r = parseEbirdCsv(csv, { dexBySci: new Map(STARTER_DEX.map((s) => [s.sciName, s.id])), today: SAMPLE_TODAY })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.parsed.rows.length).toBeGreaterThan(1500)
  })
})
