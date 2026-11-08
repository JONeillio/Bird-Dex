import { useMemo } from 'react'
import { usePublished } from '../../data/published'
import { bondRun } from '../../domain/bond'
import { allFieldReports, type FieldReport } from '../../domain/fieldReport'
import { levelBars, type LevelBar } from '../../domain/levelUps'
import { groupOutings, type Outing } from '../../domain/outings'
import { buildRarity } from '../../domain/rarity'
import { useRecords } from '../../state/records'
import { useStore } from '../../state/store'

export type ReportData =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; report: FieldReport; outing: Outing; bars: LevelBar[] }

/** One outing's Field Report, its parcel and its "what levelled up" bars, worked out from your sightings and the nearby reports. */
export function useReportData(outingKey: string): ReportData {
  const encounters = useRecords((s) => s.encounters)
  const status = useRecords((s) => s.status)
  const regionId = useStore((s) => s.prefs.regionId)
  const data = usePublished(regionId)
  const region = data.status === 'ready' ? data.region : null
  return useMemo(() => {
    if (status === 'loading') return { status: 'loading' }
    const report = allFieldReports(encounters, { rarity: buildRarity(region), region }).find((r) => r.outingKey === outingKey)
    const outing = groupOutings(encounters).find((o) => o.key === outingKey)
    if (!report || !outing) return { status: 'missing' }
    return { status: 'ready', report, outing, bars: levelBars(outing, bondRun(encounters).awards) }
  }, [encounters, status, region, outingKey])
}
