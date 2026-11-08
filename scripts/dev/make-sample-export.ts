// Writes the made-up eBird "Download My Data" export to samples/ so it can be tried without the app:
//   npx tsx scripts/dev/make-sample-export.ts
// Same generator and fixed date as Journal → Import → "Try a sample history", so the file never changes unless the generator does.
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateRawSync } from 'node:zlib'
import { STARTER_DEX } from '../../src/data/catalogue'
import { traitsById } from '../../src/data/game'
import { generateSampleHistory } from '../../src/data/importers/sample-history'

export const SAMPLE_TODAY = '2026-11-08'
export const sampleCsv = () => generateSampleHistory({ species: STARTER_DEX, traitsOf: traitsById, today: SAMPLE_TODAY })

/** A one-file ZIP (deflate) like the one eBird emails: MyEBirdData.csv inside. */
export function zipOf(name: string, data: Buffer): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  let crc = 0xffffffff
  for (const b of data) crc = crcTable[(crc ^ b) & 0xff]! ^ (crc >>> 8)
  crc = (crc ^ 0xffffffff) >>> 0
  const body = deflateRawSync(data)
  const nm = Buffer.from(name)
  const u16 = (n: number) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b }
  const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b }
  const common = [u16(20), u16(0), u16(8), u16(0), u16(0x21), u32(crc), u32(body.length), u32(data.length), u16(nm.length), u16(0)]
  const local = Buffer.concat([u32(0x04034b50), ...common, nm, body])
  const central = Buffer.concat([u32(0x02014b50), u16(20), ...common, u16(0), u16(0), u16(0), u32(0), u32(0), nm])
  const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(1), u16(1), u32(central.length), u32(local.length), u16(0)])
  return Buffer.concat([local, central, end])
}

if (process.argv[1]?.endsWith('make-sample-export.ts')) {
  mkdirSync('samples', { recursive: true })
  const csv = Buffer.from(sampleCsv())
  writeFileSync('samples/MyEBirdData-sample.csv', csv)
  writeFileSync('samples/MyEBirdData-sample.zip', zipOf('MyEBirdData.csv', csv))
  console.log(`wrote samples/MyEBirdData-sample.csv (${csv.length} bytes) and .zip`)
}
