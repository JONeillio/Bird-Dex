import { useMemo, useState } from 'react'
import { birdNews, type BirdNews } from '../domain/news'
import { buildRarity } from '../domain/rarity'
import { prefsOf, useGame } from './game'
import { useRegionStart } from './useRegionStart'
import { useStore } from './store'
import { useRecorded } from './useRecorded'

/** Bird News for the chosen start point and drive limit, plus whether it is worth a dot on the Explore header. */
export function useNews(lastSeenOverride?: string | null): { news: BirdNews | null; dot: boolean; startLabel: string; startId: string; isDemo: boolean } {
  const d = useRegionStart()
  const prefs = useStore((s) => s.prefs)
  const recorded = useRecorded()
  const seen = useGame((s) => prefsOf(s.docs).lastNewsSeenAt)
  const lastSeen = lastSeenOverride === undefined ? seen : lastSeenOverride
  const [now] = useState(() => new Date()) // fixed for this visit to the screen
  const region = d.status === 'ready' ? d.region : null
  const startId = d.status === 'ready' ? d.start.id : ''
  const news = useMemo(
    () =>
      region
        ? birdNews({ region, startId, limitMin: prefs.driveLimit, recorded, targets: prefs.targets, rarity: buildRarity(region), lastSeenAt: lastSeen, now })
        : null,
    [region, startId, prefs.driveLimit, recorded, prefs.targets, lastSeen, now],
  )
  const worthIt = !!news && (news.rareScarce.length > 0 || news.targetsReported.length > 0)
  const dot = worthIt && (lastSeen === null || news!.sinceLastLook > 0)
  return { news, dot, startLabel: d.status === 'ready' ? d.start.label : '', startId, isDemo: !!region?.isDemo }
}
