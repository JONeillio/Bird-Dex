import { useMemo, useState } from 'react'
import { groupOutings, type Outing } from '../domain/outings'
import { recentParcels } from '../domain/parcels'
import { localDate } from '../domain/callIt'
import { useOpenedKeys } from './game'
import { useRecords } from './records'

/** The new checklists waiting to be opened (last 30 days, not yet opened), newest first. */
export function useParcels(): Outing[] {
  const encounters = useRecords((s) => s.encounters)
  const opened = useOpenedKeys()
  const [today] = useState(() => localDate(new Date())) // the date when the app opened; a new day starts with the next visit
  return useMemo(() => recentParcels(groupOutings(encounters), opened, today), [encounters, opened, today])
}
