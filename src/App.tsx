import { lazy, Suspense, useEffect, useRef } from 'react'
import { PixelIcon } from './ui/components'
import { useRoute, type Route } from './router'
import { DevUi } from './features/dev/DevUi'
import JournalScreen from './features/journal/JournalScreen'
import SettingsScreen from './features/settings/SettingsScreen'
import { LogSheet } from './features/log/LogSheet'
import { Reveal } from './features/log/Reveal'
import { Toast } from './features/log/Toast'
import { useGame } from './state/game'
import { useParcels } from './state/parcels'
import { useRecords } from './state/records'
import { useStore } from './state/store'
import { play, unlockAudio } from './audio/sfx'
import { useWakeLock } from './phone/wakeLock'
import DexScreen from './features/birddex/DexScreen'
import BirdProfile from './features/bird/BirdProfile'
import DevArt from './features/dev/DevArt'
import DevEngine from './features/dev/DevEngine'
import ReportFlow from './features/report/ReportFlow'
import NewsScreen from './features/news/NewsScreen'
import FolkScreen from './features/folk/FolkScreen'
import WardenScreen from './features/folk/WardenScreen'
import CallItScreen from './features/folk/CallItScreen'
import BadgesScreen from './features/folk/BadgesScreen'
import NpcScreen from './features/folk/NpcScreen'
import PlanScreen from './features/plan/PlanScreen'
import FindScreen from './features/find/FindScreen'
import { DevDialogue } from './features/dev/DevDialogue'
import { TourOverlay } from './features/tour/TourOverlay'
import { shouldAutoStart, useTour } from './state/tour'
import type { IconName } from './art/icons'

const MapScreen = lazy(() => import('./features/map/MapScreen'))

const TABS: { name: 'map' | 'dex' | 'journal' | 'folk'; label: string; icon: IconName }[] = [
  { name: 'map', label: 'Explore', icon: 'map' },
  { name: 'dex', label: 'Dex', icon: 'bird' },
  { name: 'journal', label: 'Journal', icon: 'book' },
  { name: 'folk', label: 'Folk', icon: 'person' },
]

function activeTab(route: Route): string | null {
  if (route.name === 'bird') return 'dex'
  if (route.name === 'news' || route.name === 'find' || route.name === 'plan') return 'map'
  if (route.name === 'report') return 'journal'
  if (route.name === 'warden' || route.name === 'callit' || route.name === 'badges' || route.name === 'npc') return 'folk'
  if (route.name === 'map' || route.name === 'dex' || route.name === 'journal' || route.name === 'folk') return route.name
  return null
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'map':
      return (
        <Suspense fallback={<main className="screen">Loading map…</main>}>
          <MapScreen />
        </Suspense>
      )
    case 'dex':
      return <DexScreen />
    case 'journal':
      return <JournalScreen />
    case 'bird':
      return <BirdProfile id={route.id} />
    case 'report':
      return <ReportFlow key={route.key} outingKey={route.key} />
    case 'news':
      return <NewsScreen />
    case 'plan':
      return <PlanScreen />
    case 'folk':
      return <FolkScreen />
    case 'warden':
      return <WardenScreen id={route.id} />
    case 'callit':
      return <CallItScreen id={route.id} />
    case 'badges':
      return <BadgesScreen />
    case 'npc':
      return <NpcScreen id={route.id} />
    case 'find':
      return <FindScreen birdKey={route.key} />
    case 'settings':
      return <SettingsScreen />
    case 'dev':
      return route.page === 'art' ? <DevArt /> : route.page === 'engine' ? <DevEngine /> : route.page === 'dialogue' || route.page === 'dot' ? <DevDialogue /> : <DevUi />
  }
}

export default function App() {
  const route = useRoute()
  const current = activeTab(route)
  const soundOn = useStore((s) => s.prefs.soundOn)
  const keepAwake = useStore((s) => s.prefs.keepAwake)
  const load = useRecords((s) => s.load)
  const parcels = useParcels().length
  const first = useRef(true)
  const soundRef = useRef(soundOn)
  useEffect(() => {
    soundRef.current = soundOn
  })

  useEffect(() => void load().then(() => useGame.getState().load()), [load])

  // Dot's welcome tour starts by itself on a first visit, until it is finished or turned down.
  const toursDone = useStore((s) => s.prefs.toursDone)
  const tourOn = useTour((s) => s.tourId !== null)
  const snoozed = useTour((s) => s.snoozed)
  useEffect(() => {
    if (tourOn || !shouldAutoStart('welcome', toursDone, snoozed, route.name)) return
    const id = window.setTimeout(() => useTour.getState().start('welcome'), 900)
    return () => window.clearTimeout(id)
  }, [tourOn, toursDone, snoozed, route.name])
  useWakeLock(keepAwake)

  // Browsers keep audio locked until a tap, so the opening jingle plays on the first touch.
  useEffect(() => {
    if (!soundOn) return
    let played = false
    const onFirst = () => {
      unlockAudio()
      if (!played) {
        played = true
        play('start', true)
      }
      window.removeEventListener('pointerdown', onFirst)
    }
    window.addEventListener('pointerdown', onFirst)
    return () => window.removeEventListener('pointerdown', onFirst)
  }, [soundOn])

  // A little blip when you move between the main tabs.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (current) play('blip', soundRef.current)
  }, [current])

  return (
    <div className="app">
      <Screen route={route} />
      <LogSheet />
      <Reveal />
      <Toast />
      <TourOverlay />
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <a
            key={t.name}
            className="tab"
            href={`#/${t.name}`}
            aria-current={current === t.name ? 'page' : undefined}
            data-tour={`tab-${t.name}`}
          >
            <span className="tab-icon">
              <PixelIcon name={t.icon} size={28} colour={current === t.name ? '#fffbef' : '#213b32'} />
              {t.name === 'journal' && parcels > 0 && <span className="tab-dot" role="img" aria-label="New checklists to open" />}
            </span>
            {t.label}
          </a>
        ))}
      </nav>
    </div>
  )
}
