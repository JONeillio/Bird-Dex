import { dexById } from '../../data/catalogue'
import { limitFor, nameForKey, whereSeen } from '../../domain/findBird'
import { BAND_PHRASE } from '../../domain/news'
import { daysAgo } from '../../domain/ranking'
import { shortSiteName } from '../../domain/siteName'
import { useRegionStart } from '../../state/useRegionStart'
import { useRecorded } from '../../state/useRecorded'
import { useStore, type DriveLimit } from '../../state/store'
import { useUi } from '../../state/ui'
import { Banner, DemoStamp, Panel, Pill } from '../../ui/components'
import { BirdPortrait } from '../birddex/BirdPortrait'
import { BackButton } from '../shell/SettingsButton'
import { ReliabilityStrip } from './ReliabilityStrip'
import { outsideSpecies } from '../../domain/dexLists'

const SHOW = 5

/** "Wanted" poster for one bird: where it has been reported, how often, and when in the day. */
export default function FindScreen({ birdKey }: { birdKey: string }) {
  const d = useRegionStart()
  const prefs = useStore((s) => s.prefs)
  const setPref = useStore((s) => s.setPref)
  const setFocus = useStore((s) => s.setFocusSpecies)
  const recorded = useRecorded()
  const openLog = useUi((s) => s.openLog)

  if (d.status !== 'ready') {
    return (
      <>
        <Banner title="Find a bird" left={<BackButton to="#/" />} />
        <main className="screen"><p className="muted center">{d.status === 'loading' ? 'Loading recent reports…' : d.message}</p></main>
      </>
    )
  }
  const dex = dexById(birdKey)
  const name = dex?.name ?? nameForKey(d.region, birdKey) ?? 'Unknown bird'
  const rows = whereSeen(d.region, d.start.id, birdKey)
  const have = recorded.has(birdKey)
  const species = dex ?? outsideSpecies({ id: 'x-wanted', name })
  const show = (siteId: string, minutes: number | null) => {
    const fit = limitFor(minutes)
    if (fit && fit > prefs.driveLimit) setPref('driveLimit', fit as DriveLimit)
    setFocus(birdKey, siteId)
    window.location.hash = '#/'
  }

  return (
    <>
      <Banner title="Find a bird" left={<BackButton to="#/" />} />
      <main className="screen stack">
        <Panel className="wanted stack tight">
          <p className="wanted-kicker">WANTED</p>
          <div className="wanted-portrait"><BirdPortrait species={species} silhouette={!have} size={128} /></div>
          <h2 className="h-display center">{name}</h2>
          <div className="row center-row">
            {have ? <Pill tone="good">Recorded</Pill> : <Pill tone="warn">New to you</Pill>}
            {d.region.isDemo && <DemoStamp />}
          </div>
          <p className="muted small center">
            {rows.length === 0 ? `Not reported around ${d.start.label} in the last ${d.region.windowDays} days.` : `Reported at ${rows.length} ${rows.length === 1 ? 'place' : 'places'} in the last ${d.region.windowDays} days · driving from ${d.start.label}`}
          </p>
        </Panel>

        {rows.length > 0 && (
          <Panel className="stack tight">
            <h3 className="h-display small-h">Best places to look</h3>
            <ul className="report-list">
              {rows.slice(0, SHOW).map(({ site, report, minutes, days, bestBand }) => (
                <li key={site.id} className="report wanted-row">
                  <button type="button" className="report-main as-button" onClick={() => show(site.id, minutes)}>
                    <span>
                      <strong>{shortSiteName(site.name)}</strong> {report.notable && <Pill tone="warn">{report.unconfirmed ? 'Rare · unconfirmed' : 'Rare'}</Pill>}
                      <br />
                      <span className="muted small">
                        Last reported {daysAgo(report.obsDate)} · {minutes !== null ? `${minutes} min` : 'drive time unknown'}
                      </span>
                      <br />
                      <ReliabilityStrip days={days} windowDays={d.region.windowDays} />
                      {bestBand && <span className="muted small"><br />Most reports come {BAND_PHRASE[bestBand]}</span>}
                    </span>
                  </button>
                  <span className="report-actions">
                    <button type="button" className="btn small" onClick={() => openLog({ speciesId: dex?.id, place: shortSiteName(site.name), siteId: site.id, outside: dex ? undefined : { name, sciName: report.sciName } })}>
                      I saw it
                    </button>
                    {report.checklistUrl && (
                      <a className="report-link small" href={report.checklistUrl} target="_blank" rel="noopener" aria-label={`eBird checklist at ${shortSiteName(site.name)}`}>eBird ↗</a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {rows.length > SHOW && <p className="muted small">+{rows.length - SHOW} more on the map.</p>}
            <div className="row two">
              <button type="button" className="btn primary" onClick={() => { setFocus(birdKey); window.location.hash = '#/' }}>Show on map</button>
              <button type="button" className="btn" onClick={() => { setFocus(birdKey); window.location.hash = '#/plan' }}>Plan a day</button>
            </div>
          </Panel>
        )}
        <p className="muted small credit">
          {d.region.isDemo ? 'Demo data, invented for trying the app.' : <>Sightings: <a href="https://ebird.org" target="_blank" rel="noopener">eBird (ebird.org)</a>. Recent reports, not live positions. "N of 14 days" is how often it was reported, not a promise.</>}
        </p>
      </main>
    </>
  )
}
