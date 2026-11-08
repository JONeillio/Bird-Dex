import { describe, expect, it } from 'vitest'
import { deflateRawSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { chooseCsvEntry, extractCsvFromZip, looksLikeZip, prepareImportFile } from '../src/data/importers/zip'
import { parseEbirdCsv } from '../src/data/importers/ebird-csv'

// Builds a ZIP by hand (the same layout eBird's emailed file has), so the reader is tested on bytes it did not write.
function crc32(buf: Buffer): number {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
interface Item { name: string; data: Buffer; stored?: boolean; flags?: number }
function makeZip(items: Item[], opts: { lieSize?: number; comment?: string } = {}): Buffer {
  const locals: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  for (const it of items) {
    const body = it.stored ? it.data : deflateRawSync(it.data)
    const name = Buffer.from(it.name)
    const l = Buffer.alloc(30)
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(it.flags ?? 0, 6); l.writeUInt16LE(it.stored ? 0 : 8, 8)
    l.writeUInt32LE(crc32(it.data), 14); l.writeUInt32LE(body.length, 18); l.writeUInt32LE(opts.lieSize ?? it.data.length, 22); l.writeUInt16LE(name.length, 26)
    const extra = Buffer.from([1, 2, 3]) // a local extra field the reader must skip
    l.writeUInt16LE(extra.length, 28)
    const local = Buffer.concat([l, name, extra, body])
    const c = Buffer.alloc(46)
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(it.flags ?? 0, 8); c.writeUInt16LE(it.stored ? 0 : 8, 10)
    c.writeUInt32LE(crc32(it.data), 16); c.writeUInt32LE(body.length, 20); c.writeUInt32LE(opts.lieSize ?? it.data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42)
    central.push(Buffer.concat([c, name]))
    locals.push(local)
    offset += local.length
  }
  const dir = Buffer.concat(central)
  const comment = Buffer.from(opts.comment ?? '')
  const e = Buffer.alloc(22)
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(items.length, 8); e.writeUInt16LE(items.length, 10); e.writeUInt32LE(dir.length, 12); e.writeUInt32LE(offset, 16); e.writeUInt16LE(comment.length, 20)
  return Buffer.concat([...locals, dir, e, comment])
}
const blob = (b: Buffer) => new Blob([new Uint8Array(b)])
const CSV = 'Submission ID,Common Name,Scientific Name,Date,Time,Location,Location ID\nS1,European Robin,Erithacus rubecula,2026-11-01,07:30 AM,Test Marsh,L123\n'

describe('ZIP import (B1b)', () => {
  it('takes MyEBirdData.csv out of a deflated ZIP, ignoring other files and folders', async () => {
    const zip = makeZip([
      { name: '__MACOSX/._MyEBirdData.csv', data: Buffer.from('junk') },
      { name: 'readme.txt', data: Buffer.from('hello') },
      { name: 'eBird/', data: Buffer.alloc(0), stored: true },
      { name: 'eBird/MyEBirdData.csv', data: Buffer.from(CSV) },
    ])
    const out = await extractCsvFromZip(blob(zip))
    expect(out.ok && out.file.name).toBe('MyEBirdData.csv')
    expect(out.ok && (await out.file.text())).toBe(CSV)
  })

  it('reads stored (uncompressed) entries and ZIPs with a trailing comment', async () => {
    const out = await extractCsvFromZip(blob(makeZip([{ name: 'MyEBirdData.csv', data: Buffer.from(CSV), stored: true }], { comment: 'sent by eBird' })))
    expect(out.ok && (await out.file.text())).toBe(CSV)
  })

  it('falls back to the first .csv when the usual name is missing', () => {
    expect(chooseCsvEntry([{ name: 'a.txt' }, { name: 'export.CSV' }, { name: 'other.csv' }])?.name).toBe('export.CSV')
    expect(chooseCsvEntry([{ name: 'a.txt' }])).toBeUndefined()
  })

  it('gives plain-English errors: no CSV, password, too big, lying size, not a ZIP', async () => {
    const none = await extractCsvFromZip(blob(makeZip([{ name: 'a.txt', data: Buffer.from('x') }])))
    expect(!none.ok && none.error).toMatch(/no CSV/i)
    const pw = await extractCsvFromZip(blob(makeZip([{ name: 'MyEBirdData.csv', data: Buffer.from(CSV), flags: 1 }])))
    expect(!pw.ok && pw.error).toMatch(/password/i)
    const big = await extractCsvFromZip(blob(makeZip([{ name: 'MyEBirdData.csv', data: Buffer.from(CSV) }])), 10)
    expect(!big.ok && big.error).toMatch(/too big/i)
    // A ZIP that claims to be small but inflates past the cap is stopped while reading.
    const liar = await extractCsvFromZip(blob(makeZip([{ name: 'MyEBirdData.csv', data: Buffer.alloc(5000, 97) }], { lieSize: 5 })), 1000)
    expect(!liar.ok && liar.error).toMatch(/too big/i)
    const junk = await extractCsvFromZip(blob(Buffer.from('PK\x03\x04 not really a zip at all, just text')))
    expect(!junk.ok && junk.error).toMatch(/Could not read/i)
  })

  it('spots a ZIP by its first bytes, and leaves a CSV alone', async () => {
    expect(await looksLikeZip(blob(makeZip([{ name: 'a.csv', data: Buffer.from(CSV) }])))).toBe(true)
    expect(await looksLikeZip(blob(Buffer.from(CSV)))).toBe(false)
    const csv = new File([CSV], 'MyEBirdData.csv')
    const out = await prepareImportFile(csv)
    expect(out.ok && out.file).toBe(csv)
    const zipped = await prepareImportFile(new File([new Uint8Array(makeZip([{ name: 'MyEBirdData.csv', data: Buffer.from(CSV) }]))], 'download.zip'))
    expect(zipped.ok && (await zipped.file.text())).toBe(CSV)
  })

  it('opens the committed sample ZIP and gets the same rows as the sample CSV', async () => {
    const zip = new File([new Uint8Array(readFileSync('samples/MyEBirdData-sample.zip'))], 'MyEBirdData-sample.zip')
    const out = await prepareImportFile(zip)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const opts = { dexBySci: new Map<string, string>(), today: '2030-01-01' }
    const fromZip = parseEbirdCsv(await out.file.text(), opts)
    const fromCsv = parseEbirdCsv(readFileSync('samples/MyEBirdData-sample.csv', 'utf8'), opts)
    expect(fromZip.ok && fromCsv.ok && fromZip.parsed.totalRows).toBe(fromCsv.ok && fromCsv.parsed.totalRows)
    expect(fromZip.ok && fromZip.parsed.totalRows).toBeGreaterThan(200)
  })
})
