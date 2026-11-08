import { useMemo, useState } from 'react'
import { wardensFor, type Warden } from '../../data/game'
import { usePublished } from '../../data/published'
import type { RegionData, Site } from '../../data/published-schema'
import { asCallRecord, type CallRecord } from '../../data/personal/game-schema'
import { callWinsOf, settle, type Settlement } from '../../domain/callIt'
import { visitedSiteIds } from '../../domain/explore'
import { useGame } from '../../state/game'
import { useRecords } from '../../state/records'
import { useStore } from '../../state/store'

export interface CallView { call: CallRecord; settlement: Settlement }

/** Everything the Folk screens need: this region's wardens, which you have met, your calls and their results. */
export function useFolk() {
  const regionId = useStore((s) => s.prefs.regionId)
  const demo = useStore((s) => s.prefs.demoCollection)
  const data = usePublished(regionId)
  const encounters = useRecords((s) => s.encounters)
  const docs = useGame((s) => s.docs)
  const [now] = useState(() => new Date())
  const region: RegionData | null = data.status === 'ready' ? data.region : null
  const wardens: readonly Warden[] = useMemo(() => wardensFor(data.status === 'ready' ? data.regionId : regionId), [data, regionId])
  const real = useMemo(() => (demo ? [] : encounters.filter((e) => e.source !== 'sample')), [encounters, demo])
  const visited = useMemo(() => visitedSiteIds(demo ? [] : encounters), [encounters, demo])
  const calls = useMemo<CallView[]>(() => {
    const out: CallView[] = []
    for (const d of Object.values(docs)) {
      const call = asCallRecord(d)
      if (call) out.push({ call, settlement: settle(call, encounters, now) })
    }
    return out.sort((a, b) => b.call.madeAt.localeCompare(a.call.madeAt))
  }, [docs, encounters, now])
  const callWins = useMemo(() => callWinsOf(Object.values(docs), encounters, now), [docs, encounters, now])
  const siteOf = (w: Warden): Site | null => region?.sites.find((s) => s.id === w.siteId) ?? null
  return { regionId, region, wardens, real, encounters, visited, calls, callWins, now, siteOf, loading: data.status === 'loading', isDemo: !!region?.isDemo }
}
