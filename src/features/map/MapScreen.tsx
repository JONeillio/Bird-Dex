import { Banner, DemoStamp, Panel } from '../../ui/components'
import { SettingsButton } from '../shell/SettingsButton'

/** Placeholder: the real MapLibre map arrives in milestone M3. Loaded lazily so BirdDex opens fast. */
export default function MapScreen() {
  return (
    <>
      <Banner title="Map" right={<SettingsButton />} />
      <main className="screen stack">
        <Panel className="coming">
          <h2 className="h-display">Map coming soon</h2>
          <p className="muted">Today's Quest, birding sites and drive times arrive in milestone 3.</p>
          <DemoStamp />
        </Panel>
      </main>
    </>
  )
}
