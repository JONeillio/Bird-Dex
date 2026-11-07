import { useMemo } from 'react'
import { recordedIds } from '../domain/collection'
import { useRecords } from './records'
import { useStore } from './store'

/** The species that count as recorded right now: your logged sightings, or the labelled demo collection. */
export function useRecorded(): ReadonlySet<string> {
  const demo = useStore((s) => s.prefs.demoCollection)
  const encounters = useRecords((s) => s.encounters)
  return useMemo(() => recordedIds({ demoCollection: demo }, encounters), [demo, encounters])
}
