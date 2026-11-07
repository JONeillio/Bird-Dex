import { Banner, Panel } from '../../ui/components'
import { BackButton, SettingsButton } from './SettingsButton'

function Coming({ title, note }: { title: string; note: string }) {
  return (
    <Panel className="coming">
      <h2 className="h-display">{title}</h2>
      <p className="muted">{note}</p>
    </Panel>
  )
}

export function DexPlaceholder() {
  return (
    <>
      <Banner title="BirdDex" right={<SettingsButton />} />
      <main className="screen stack">
        <Coming title="Your BirdDex" note="The Starter Dex and bird cards arrive in milestone 1." />
      </main>
    </>
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

export function BirdPlaceholder({ id }: { id: string }) {
  return (
    <>
      <Banner title="Bird profile" left={<BackButton to="#/dex" />} />
      <main className="screen stack">
        <Coming title={id} note="Bird profiles arrive in milestone 1." />
      </main>
    </>
  )
}

export function SettingsPlaceholder() {
  return (
    <>
      <Banner title="Settings" left={<BackButton to="#/map" />} />
      <main className="screen stack">
        <Panel className="stack">
          <h2 className="h-display" style={{ fontSize: 22 }}>
            About
          </h2>
          <p>
            BirdQuest is a personal, non-commercial project. Sightings will come from eBird (ebird.org), drive times
            from openrouteservice by HeiGIT, and map data from OpenStreetMap contributors via OpenFreeMap.
          </p>
          <p className="muted">
            Your records will live on this phone only. Backups arrive in milestone 2. <a href="#/dev/ui">UI kit</a>
          </p>
        </Panel>
      </main>
    </>
  )
}
