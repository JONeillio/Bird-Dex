import { usePublished } from '../data/published'
import { useStore } from './store'

/** The chosen region and its first start point, once the published data has loaded. */
export function useRegionStart() {
  const regionId = useStore((s) => s.prefs.regionId)
  const data = usePublished(regionId)
  if (data.status !== 'ready') return { status: data.status, message: data.status === 'error' ? data.message : '' } as const
  const ref = data.index.regions.find((r) => r.id === data.regionId)!
  return { status: 'ready', region: data.region, ref, start: ref.startPoints[0] } as const
}
