import { usePublished } from '../data/published'
import { pickStart } from '../data/startPoint'
import { useStore } from './store'

/** The chosen region and its first start point, once the published data has loaded. */
export function useRegionStart() {
  const regionId = useStore((s) => s.prefs.regionId)
  const startId = useStore((s) => s.prefs.startId)
  const data = usePublished(regionId)
  if (data.status !== 'ready') return { status: data.status, message: data.status === 'error' ? data.message : '' } as const
  const ref = data.index.regions.find((r) => r.id === data.regionId)!
  return { status: 'ready', region: data.region, ref, start: pickStart(ref, startId) } as const
}
