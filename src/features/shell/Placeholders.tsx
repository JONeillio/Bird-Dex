import { Banner, Chip, Panel } from '../../ui/components'
import { useStore } from '../../state/store'
import { BackButton, SettingsButton } from './SettingsButton'

function Coming({ title, note }: { title: string; note: string }) {
  return (
    <Panel className="coming">
      <h2 className="h-display">{title}</h2>
      <p className="muted">{note}</p>
    </Panel>
  )
}

export function JournalPlaceholder() {
  return (
    <>
      <Banner title="Journal" right={<SettingsButton />} />
      <main className="screen stack">
        <Coming title="Your journal" note="Logging sightings and backups arrive in milestone 2." />
      </main>
    </>
  )
}

export function SettingsPlaceholder() {
  const demo = useStore((s) => s.prefs.demoCollection)
  const setPref = useStore((s) => s.setPref)
  return (
    <>
      <Banner title="Settings" left={<BackButton to="#/map" />} />
      <main className="screen stack">
        <Panel className="stack">
          <h2 className="h-display" style={{ fontSize: 22 }}>
            Demo collection
          </h2>
          <p className="muted">Fills your BirdDex with 24 labelled demo birds so you can see how it looks. It never counts as real progress.</p>
          <div className="row">
            <Chip active={demo} onClick={() => setPref('demoCollection', !demo)}>
              {demo ? 'Demo collection on' : 'Demo collection off'}
            </Chip>
          </div>
        </Panel>
        <Panel className="stack">
          <h2 className="h-display" style={{ fontSize: 22 }}>
            About
          </h2>
          <p>
            BirdQuest is a personal, non-commercial project. Sightings will come from eBird (ebird.org), drive times
            from openrouteservice by HeiGIT, and map data from OpenStreetMap contributors via OpenFreeMap.
          </p>
          <p className="muted">
            Your records will live on this phone only. Backups arrive in milestone 2. <a href="#/dev/ui">UI kit</a> · <a href="#/dev/art">Bird art</a>
          </p>
        </Panel>
      </main>
    </>
  )
}
