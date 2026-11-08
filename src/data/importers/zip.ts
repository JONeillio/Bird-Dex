// A minimal ZIP reader, just enough to pull MyEBirdData.csv out of the ZIP eBird emails you.
// It reads the central directory, then inflates one entry with the browser's DecompressionStream ('deflate-raw').
// Nothing leaves the phone. No ZIP64, no encryption: those get a plain-English message.

export const MAX_UNZIPPED_BYTES = 200 * 1024 * 1024

export type UnzipOutcome = { ok: true; file: File } | { ok: false; error: string }

const SIG_EOCD = 0x06054b50
const SIG_CENTRAL = 0x02014b50
const SIG_LOCAL = 0x04034b50
const TOO_BIG = 'That file is too big to read here (over 200 MB once unzipped).'
const BAD_ZIP = 'Could not read that ZIP. Try extracting MyEBirdData.csv and choosing that instead.'

/** True when the first bytes are a ZIP header ("PK"), whatever the file is called. */
export async function looksLikeZip(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  return head[0] === 0x50 && head[1] === 0x4b && (head[2] === 3 || head[2] === 5) && (head[3] === 4 || head[3] === 6)
}

interface Entry {
  name: string
  method: number
  flags: number
  compressed: number
  uncompressed: number
  offset: number
}

/** Pick the eBird file: MyEBirdData.csv if present, else the first .csv. Folders and macOS junk are ignored. */
export function chooseCsvEntry<T extends { name: string }>(entries: readonly T[]): T | undefined {
  const csvs = entries.filter((e) => !e.name.endsWith('/') && !e.name.startsWith('__MACOSX/') && /\.csv$/i.test(e.name) && !/(^|\/)\._/.test(e.name))
  return csvs.find((e) => /(^|\/)myebirddata\.csv$/i.test(e.name)) ?? csvs[0]
}

async function readEntries(zip: Blob): Promise<Entry[] | string> {
  const tailLen = Math.min(zip.size, 22 + 65535)
  const tail = new DataView(await zip.slice(zip.size - tailLen).arrayBuffer())
  let eocd = -1
  for (let i = tailLen - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === SIG_EOCD) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return BAD_ZIP
  const count = tail.getUint16(eocd + 10, true)
  const size = tail.getUint32(eocd + 12, true)
  const start = tail.getUint32(eocd + 16, true)
  if (count === 0xffff || size === 0xffffffff || start === 0xffffffff) return 'That ZIP uses a format this app cannot open. Try extracting MyEBirdData.csv and choosing that instead.'
  if (start + size > zip.size) return BAD_ZIP
  const dir = new DataView(await zip.slice(start, start + size).arrayBuffer())
  const decoder = new TextDecoder()
  const entries: Entry[] = []
  let p = 0
  for (let i = 0; i < count; i++) {
    if (p + 46 > dir.byteLength || dir.getUint32(p, true) !== SIG_CENTRAL) return BAD_ZIP
    const nameLen = dir.getUint16(p + 28, true)
    const extraLen = dir.getUint16(p + 30, true)
    const commentLen = dir.getUint16(p + 32, true)
    if (p + 46 + nameLen > dir.byteLength) return BAD_ZIP
    entries.push({
      name: decoder.decode(new Uint8Array(dir.buffer, dir.byteOffset + p + 46, nameLen)),
      flags: dir.getUint16(p + 8, true),
      method: dir.getUint16(p + 10, true),
      compressed: dir.getUint32(p + 20, true),
      uncompressed: dir.getUint32(p + 24, true),
      offset: dir.getUint32(p + 42, true),
    })
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

/** Inflate with a hard cap, so a ZIP that lies about its size cannot fill the phone's memory. */
async function inflate(compressed: Blob, cap: number): Promise<Blob | null> {
  const stream = compressed.stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const reader = stream.getReader()
  const parts: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > cap) {
      await reader.cancel()
      return null
    }
    parts.push(value)
  }
  return new Blob(parts as BlobPart[])
}

/** Find the CSV inside an eBird ZIP and return it as a File that the normal streaming parser can read. */
export async function extractCsvFromZip(zip: Blob, cap: number = MAX_UNZIPPED_BYTES): Promise<UnzipOutcome> {
  try {
    const entries = await readEntries(zip)
    if (typeof entries === 'string') return { ok: false, error: entries }
    const entry = chooseCsvEntry(entries)
    if (!entry) return { ok: false, error: 'There is no CSV file inside that ZIP. eBird’s download holds one called MyEBirdData.csv.' }
    if (entry.flags & 1) return { ok: false, error: 'That ZIP is password protected, so it cannot be opened here.' }
    if (entry.uncompressed > cap) return { ok: false, error: TOO_BIG }
    if (entry.method !== 0 && entry.method !== 8) return { ok: false, error: BAD_ZIP }

    const local = new DataView(await zip.slice(entry.offset, entry.offset + 30).arrayBuffer())
    if (local.byteLength < 30 || local.getUint32(0, true) !== SIG_LOCAL) return { ok: false, error: BAD_ZIP }
    const dataStart = entry.offset + 30 + local.getUint16(26, true) + local.getUint16(28, true)
    const raw = zip.slice(dataStart, dataStart + entry.compressed)
    const data = entry.method === 0 ? raw : await inflate(raw, cap)
    if (!data) return { ok: false, error: TOO_BIG }
    if (data.size > cap) return { ok: false, error: TOO_BIG }
    const base = entry.name.split('/').pop() ?? entry.name
    return { ok: true, file: new File([data], base, { type: 'text/csv' }) }
  } catch {
    return { ok: false, error: BAD_ZIP }
  }
}

/** A CSV is returned as it is; a ZIP has its CSV taken out. */
export async function prepareImportFile(file: File, cap: number = MAX_UNZIPPED_BYTES): Promise<UnzipOutcome> {
  return (await looksLikeZip(file)) ? extractCsvFromZip(file, cap) : { ok: true, file }
}
