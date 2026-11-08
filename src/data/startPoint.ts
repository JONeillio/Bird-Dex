import type { RegionRef } from './published-schema'

/** The start point you chose in this region, else its first one. Drive times are always "from" this point. */
export function pickStart(ref: RegionRef, startId: string): RegionRef['startPoints'][number] {
  return ref.startPoints.find((s) => s.id === startId) ?? ref.startPoints[0]
}
