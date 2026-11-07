import { dexById } from '../../data/catalogue'
import { SET_LABELS } from '../../data/schema'
import { recordedIds } from '../../domain/collection'
import { sceneDataUrl } from '../../art/scenes'
import { useStore } from '../../state/store'
import { Banner, Chip, DemoStamp, Panel, Pill } from '../../ui/components'
import { BackButton } from '../shell/SettingsButton'
import { BirdPortrait } from '../birddex/BirdPortrait'

export default function BirdProfile({ id }: { id: string }) {
  const prefs = useStore((s) => s.prefs)
  const toggleTarget = useStore((s) => s.toggleTarget)
  const setFocus = useStore((s) => s.setFocusSpecies)
  const species = dexById(id)

  if (!species) {
    return (
      <>
        <Banner title="Bird profile" left={<BackButton to="#/dex" />} />
        <main className="screen stack">
          <Panel className="coming">
            <h2 className="h-display">Bird not found</h2>
            <p className="muted">That bird is not in the Starter Dex.</p>
            <a className="btn" href="#/dex">Back to BirdDex</a>
          </Panel>
        </main>
      </>
    )
  }

  const isRecorded = recordedIds(prefs).has(species.id)
  const isTarget = prefs.targets.includes(species.id)
  const xenoCanto = `https://xeno-canto.org/explore?query=${encodeURIComponent(species.sciName)}`

  return (
    <>
      <Banner title="Bird profile" left={<BackButton to="#/dex" />} />
      <main className="screen stack">
        <div className="scene" style={{ backgroundImage: `url(${sceneDataUrl(species.habitat)})` }}>
          <BirdPortrait species={species} silhouette={!isRecorded} size={192} />
        </div>

        <div className="stack tight">
          <div className="row spread">
            <h2 className="h-display">{species.name}</h2>
            <span className="dexno-big">#{String(species.dexNo).padStart(3, '0')}</span>
          </div>
          <p className="muted sci">{species.sciName}</p>
          <div className="row">
            {isRecorded ? <Pill tone="good">Recorded</Pill> : <Pill>Not yet recorded</Pill>}
            {isRecorded && prefs.demoCollection && <DemoStamp />}
          </div>
          <div className="row">
            {species.sets.map((s) => (
              <Pill key={s}>{SET_LABELS[s]}</Pill>
            ))}
            <Chip active={isTarget} tone="coral" onClick={() => toggleTarget(species.id)}>
              {isTarget ? '★ Target' : '☆ Target'}
            </Chip>
          </div>
        </div>

        <div className="stack tight">
          <a className="btn primary block" href="#/map" onClick={() => setFocus(species.id)}>
            Find nearby
          </a>
          <div className="row two">
            <a className="btn" href={xenoCanto} target="_blank" rel="noreferrer">
              Listen ↗
            </a>
            <button type="button" className="btn" disabled>
              Log a sighting
            </button>
          </div>
          <p className="muted small">Logging a sighting arrives in the next milestone.</p>
        </div>

        <Panel className="stack tight">
          <h3 className="h-display small-h">Reported nearby</h3>
          <p className="muted">Nearby reports appear here once the map and live data are connected.</p>
        </Panel>
        <Panel className="stack tight">
          <h3 className="h-display small-h">Your sightings</h3>
          <p className="muted">{isRecorded ? 'Demo collection: no individual sightings.' : 'No sightings yet.'}</p>
        </Panel>
      </main>
    </>
  )
}
