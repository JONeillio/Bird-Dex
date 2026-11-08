import { lazy, Suspense, useEffect, useRef } from 'react'
import { PixelIcon } from './ui/components'
import { useRoute, type Route } from './router'
import { DevUi } from './features/dev/DevUi'
import JournalScreen from './features/journal/JournalScreen'
import SettingsScreen from './features/settings/SettingsScreen'
import { LogSheet } from './features/log/LogSheet'
import { Reveal } from './features/log/Reveal'
import { Toast } from './features/log/Toast'
import { useRecords } from './state/records'
import { useStore } from './state/store'
import { play, unlockAudio } from './audio/sfx'
import { useWakeLock } from './phone/wakeLock'
import DexScreen from './features/birddex/DexScreen'
import BirdProfile from './features/bird/BirdProfile'
import DevArt from './features/dev/DevArt'
import DevEngine from './features/dev/DevEngine'
import type { IconName } from './art/icons'

const MapScreen = lazy(() => import('./features/map/MapScreen'))

const TABS: { name: 'map' | 'dex' | 'journal'; label: string; icon: IconName }[] = [
  { name: 'map', label: 'Map', icon: 'map' },
  { name: 'dex', label: 'BirdDex', icon: 'bird' },
  { name: 'journal', label: 'Journal', icon: 'book' },
]

function activeTab(route: Route): string | null {
  if (route.name === 'bird') return 'dex'
  if (route.name === 'map' || route.name === 'dex' || route.name === 'journal') return route.name
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
    case 'settings':
      return <SettingsScreen />
    case 'dev':
      return route.page === 'art' ? <DevArt /> : route.page === 'engine' ? <DevEngine /> : <DevUi />
  }
}

export default function App() {
  const route = useRoute()
  const current = activeTab(route)
  const soundOn = useStore((s) => s.prefs.soundOn)
  const keepAwake = useStore((s) => s.prefs.keepAwake)
  const load = useRecords((s) => s.load)
  const first = useRef(true)
  const soundRef = useRef(soundOn)
  useEffect(() => {
    soundRef.current = soundOn
  })

  useEffect(() => void load(), [load])
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
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <a
            key={t.name}
            className="tab"
            href={`#/${t.name}`}
            aria-current={current === t.name ? 'page' : undefined}
          >
            <PixelIcon name={t.icon} size={28} colour={current === t.name ? '#fffbef' : '#213b32'} />
            {t.label}
          </a>
        ))}
      </nav>
    </div>
  )
}
