import { useState } from 'react'
import { dexById } from '../../data/catalogue'
import { SET_LABELS } from '../../data/schema'
import { sceneDataUrl } from '../../art/scenes'
import { useStore } from '../../state/store'
import { useRecords } from '../../state/records'
import { useRecorded } from '../../state/useRecorded'
import { useUi } from '../../state/ui'
import { useTilt } from '../../phone/tilt'
import { MODE_LABELS } from '../../data/personal-schema'
import { deriveRecords } from '../../domain/collection'
import { formatDate, sortEncounters } from '../../domain/journal'
import { Banner, Chip, DemoStamp, Panel, Pill } from '../../ui/components'
import { BackButton } from '../shell/SettingsButton'
import { BirdPortrait } from '../birddex/BirdPortrait'
import { usePublished } from '../../data/published'
import { limitFor, whereSeen } from '../../domain/findBird'
import { daysAgo } from '../../domain/ranking'
import { shortSiteName } from '../../domain/siteName'
import type { DriveLimit } from '../../state/store'

export default function BirdProfile({ id }: { id: string }) {
  const prefs = useStore((s) => s.prefs)
  const toggleTarget = useStore((s) => s.toggleTarget)
  const setFocus = useStore((s) => s.setFocusSpecies)
  const recorded = useRecorded()
  const encounters = useRecords((s) => s.encounters)
  const openLog = useUi((s) => s.openLog)
  const tiltRef = useTilt<HTMLDivElement>(prefs.tiltOn)
  const species = dexById(id)
  const [shownMine, setShownMine] = useState(20)

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

  const isRecorded = recorded.has(species.id)
  const mine = sortEncounters(encounters.filter((e) => e.speciesId === species.id))
  const rec = deriveRecords(mine).get(species.id)
  const isTarget = prefs.targets.includes(species.id)
  const xenoCanto = `https://xeno-canto.org/explore?query=${encodeURIComponent(species.sciName)}`

  return (
    <>
      <Banner title="Bird profile" left={<BackButton to="#/dex" />} />
      <main className="screen stack">
        <div className={`scene tilt-scene ${isRecorded ? 'foil' : ''}`.trim()} ref={tiltRef} style={{ backgroundImage: `url(${sceneDataUrl(species.habitat)})` }}>
          <BirdPortrait className="scene-bird" species={species} silhouette={!isRecorded} size={192} />
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
            <button type="button" className="btn" onClick={() => openLog({ speciesId: species.id })}>
              Log a sighting
            </button>
          </div>
        </div>

        <ReportedNearby speciesId={species.id} name={species.name} />
        <Panel className="stack tight">
          <h3 className="h-display small-h">Your sightings</h3>
          {mine.length === 0 ? (
            <p className="muted">{prefs.demoCollection && isRecorded ? 'Demo collection: no individual sightings.' : 'No sightings yet. Tap Log a sighting when you see or hear one.'}</p>
          ) : (
            <>
              <p className="muted small">
                {mine.length} {mine.length === 1 ? 'sighting' : 'sightings'}
                {rec?.firstDate ? ` · first ${formatDate(rec.firstDate)}` : ''}
              </p>
              <ul className="journal-list compact">
                {mine.slice(0, shownMine).map((e) => (
                  <li key={e.id} className="journal-item">
                    <div className="journal-main">
                      <strong>
                        {formatDate(e.date)}
                        {e.time ? ` · ${e.time}` : ''}
                      </strong>
                      <span className="muted small">
                        {MODE_LABELS[e.mode]}
                        {e.place ? ` · ${e.place}` : ''}
                      </span>
                      {e.notes && <span className="small">{e.notes}</span>}
                      {e.photo && <img className="journal-photo" src={e.photo} alt={`Your photo of ${species.name}`} />}
                    </div>
                  </li>
                ))}
              </ul>
              {mine.length > shownMine && (
                <button type="button" className="btn small" onClick={() => setShownMine(shownMine + 40)}>
                  Show more ({mine.length - shownMine} left)
                </button>
              )}
            </>
          )}
        </Panel>
      </main>
    </>
  )
}

const SHOW = 6

/** Where this bird was reported recently around the chosen location: newest first, then nearest. */
function ReportedNearby({ speciesId, name }: { speciesId: string; name: string }) {
  const prefs = useStore((s) => s.prefs)
  const setPref = useStore((s) => s.setPref)
  const setFocus = useStore((s) => s.setFocusSpecies)
  const openLog = useUi((s) => s.openLog)
  const data = usePublished(prefs.regionId)
  if (data.status !== 'ready') {
    return (
      <Panel className="stack tight">
        <h3 className="h-display small-h">Reported nearby</h3>
        <p className="muted">{data.status === 'loading' ? 'Loading recent reports…' : 'Recent reports could not be loaded right now.'}</p>
      </Panel>
    )
  }
  const ref = data.index.regions.find((r) => r.id === data.regionId)!
  const start = ref.startPoints[0]
  const rows = whereSeen(data.region, start.id, speciesId)
  const go = (siteId: string, minutes: number | null) => {
    const fit = limitFor(minutes)
    if (fit && fit > prefs.driveLimit) setPref('driveLimit', fit as DriveLimit)
    setFocus(speciesId, siteId)
  }
  return (
    <Panel className="stack tight">
      <div className="row spread">
        <h3 className="h-display small-h">Reported nearby</h3>
        {data.region.isDemo && <DemoStamp />}
      </div>
      {rows.length === 0 ? (
        <p className="muted">
          No reports of {name} around {start.label} in the last {data.region.windowDays} days.
        </p>
      ) : (
        <>
          <p className="muted small">
            {rows.length} {rows.length === 1 ? 'site' : 'sites'} in the last {data.region.windowDays} days · driving from {start.label}
          </p>
          <ul className="report-list">
            {rows.slice(0, SHOW).map(({ site, report, minutes }) => (
              <li key={site.id} className="report">
                <a className="report-main" href="#/map" onClick={() => go(site.id, minutes)}>
                  <span>
                    <strong>{shortSiteName(site.name)}</strong> {report.notable && <Pill tone="warn">{report.unconfirmed ? 'Rare · unconfirmed' : 'Rare'}</Pill>}
                    <br />
                    <span className="muted small">
                      {daysAgo(report.obsDate)}
                      {report.count ? ` · ${report.count} seen` : ''} · {minutes !== null ? `${minutes} min` : 'drive time unknown'}
                    </span>
                  </span>
                </a>
                <span className="report-actions">
                  <button type="button" className="btn small" onClick={() => openLog({ speciesId, place: shortSiteName(site.name), siteId: site.id })}>
                    I saw it
                  </button>
                  {report.checklistUrl && (
                    <a className="report-link small" href={report.checklistUrl} target="_blank" rel="noopener" aria-label={`eBird checklist at ${shortSiteName(site.name)}`}>
                      eBird ↗
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {rows.length > SHOW && (
            <a className="btn small" href="#/map" onClick={() => setFocus(speciesId)}>
              See all {rows.length} on the map
            </a>
          )}
        </>
      )}
      <p className="muted small credit">
        {data.region.isDemo ? 'Demo data, invented for trying the app.' : <>Sightings: <a href="https://ebird.org" target="_blank" rel="noopener">eBird (ebird.org)</a>. Recent reports, not live positions.</>}
      </p>
    </Panel>
  )
}
