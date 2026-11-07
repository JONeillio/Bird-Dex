import { lazy, Suspense } from 'react'
import { PixelIcon } from './ui/components'
import { useRoute, type Route } from './router'
import { DevUi } from './features/dev/DevUi'
import { JournalPlaceholder, SettingsPlaceholder } from './features/shell/Placeholders'
import DexScreen from './features/birddex/DexScreen'
import BirdProfile from './features/bird/BirdProfile'
import DevArt from './features/dev/DevArt'
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
      return <JournalPlaceholder />
    case 'bird':
      return <BirdProfile id={route.id} />
    case 'settings':
      return <SettingsPlaceholder />
    case 'dev':
      return route.page === 'art' ? <DevArt /> : <DevUi />
  }
}

export default function App() {
  const route = useRoute()
  const current = activeTab(route)
  return (
    <div className="app">
      <Screen route={route} />
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
