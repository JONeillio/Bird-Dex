// Loads the published JSON: live data at /data/ first, then the labelled demo copy at /demo/data/.
// Every file is validated; a bad or missing file gives a friendly error state, never a crash.
import { useEffect, useState } from 'react'
import { IndexSchema, RegionSchema, type PublishedIndex, type RegionData } from './published-schema'

const BASE = import.meta.env.BASE_URL

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, { cache: 'no-cache' })
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}

export interface Loaded {
  index: PublishedIndex
  /** Folder the index came from, e.g. "/Bird-Dex/data/". Region files are relative to it. */
  root: string
}

let indexPromise: Promise<Loaded> | null = null
const regionCache = new Map<string, Promise<RegionData>>()

export function loadIndex(): Promise<Loaded> {
  indexPromise ??= (async () => {
    for (const root of [`${BASE}data/`, `${BASE}demo/data/`]) {
      try {
        const index = IndexSchema.parse(await getJson(`${root}index.json`))
        return { index, root }
      } catch {
        /* try the next source */
      }
    }
    throw new Error('No sightings data could be loaded.')
  })()
  indexPromise.catch(() => (indexPromise = null))
  return indexPromise
}

export function loadRegion(root: string, file: string): Promise<RegionData> {
  const url = root + file
  let p = regionCache.get(url)
  if (!p) {
    p = getJson(url).then((j) => RegionSchema.parse(j))
    p.catch(() => regionCache.delete(url))
    regionCache.set(url, p)
  }
  return p
}

export type DataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; index: PublishedIndex; regionId: string; region: RegionData }

/** Index plus the chosen region (falls back to the first region if the id is unknown). */
export function usePublished(regionId: string): DataState {
  const [state, setState] = useState<DataState>({ status: 'loading' })
  useEffect(() => {
    let live = true
    loadIndex()
      .then(async ({ index, root }) => {
        const ref = index.regions.find((r) => r.id === regionId) ?? index.regions[0]
        const region = await loadRegion(root, ref.file)
        if (live) setState({ status: 'ready', index, regionId: ref.id, region })
      })
      .catch((e: unknown) => live && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      live = false
    }
  }, [regionId])
  return state
}
