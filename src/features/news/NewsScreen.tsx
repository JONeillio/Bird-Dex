import { useEffect, useState } from 'react'
import { dexById } from '../../data/catalogue'
import { birdKey } from '../../domain/findBird'
import { daysAgo, ageLabel } from '../../domain/ranking'
import { shortSiteName } from '../../domain/siteName'
import { prefsOf, useGame } from '../../state/game'
import { useNews } from '../../state/useNews'
import { useStore } from '../../state/store'
import { Banner, DemoStamp, Panel, Pill } from '../../ui/components'
import { ReliabilityStrip } from '../find/ReliabilityStrip'
import { BackButton } from '../shell/SettingsButton'
import { birdSrc } from '../map/birdArt'
import type { NewsSighting } from '../../domain/news'

/** What is worth knowing within your drive limit: rarities, your targets, and how many birds are new to you. */
export default function NewsScreen() {
  const limit = useStore((s) => s.prefs.driveLimit)
  const setFocus = useStore((s) => s.setFocusSpecies)
  const setPrefs = useGame((s) => s.setPrefs)
  const [before] = useState<string | null>(() => prefsOf(useGame.getState().docs).lastNewsSeenAt)
  const { news, startLabel, isDemo } = useNews(before)
  useEffect(() => {
    void setPrefs({ lastNewsSeenAt: new Date().toISOString() })
  }, [setPrefs])

  const go = (s: NewsSighting) => {
    setFocus(s.report.speciesId ?? birdKey(s.report), s.site.id)
    window.location.hash = '#/'
  }

  return (
    <>
      <Banner title="Bird News" left={<BackButton to="#/" />} />
      <main className="screen stack">
        {!news ? (
          <p className="muted center">Loading recent reports…</p>
        ) : (
          <>
            <div className="row spread">
              <p className="muted small">Within {limit} min of {startLabel}. Updated {ageLabel(news.generatedAt)}.</p>
              {isDemo && <DemoStamp />}
            </div>
            <Panel className="stack tight">
              <h3 className="h-display small-h">New to you</h3>
              <p>
                <strong>{news.newToYou}</strong> {news.newToYou === 1 ? 'bird' : 'birds'} from your BirdDex {news.newToYou === 1 ? 'has' : 'have'} been reported nearby that you have not recorded yet.
              </p>
              {news.sinceLastLook > 0 && <p className="muted small">{news.sinceLastLook} new {news.sinceLastLook === 1 ? 'report' : 'reports'} since you last looked.</p>}
              <a className="btn small" href="#/">See them on the map</a>
            </Panel>

            <Panel className="stack tight">
              <h3 className="h-display small-h">Your targets</h3>
              {news.targetsReported.length === 0 ? (
                <p className="muted">None of your targets have been reported within {limit} min. Open a bird and tap Target to follow it.</p>
              ) : (
                <ul className="report-list">
                  {news.targetsReported.map((s) => (
                    <NewsRow key={s.report.ebirdCode} s={s} onGo={go} windowDays={14} />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel className="stack tight">
              <h3 className="h-display small-h">Rare and scarce</h3>
              {news.rareScarce.length === 0 ? (
                <p className="muted">Nothing rare reported within {limit} min in the last two weeks.</p>
              ) : (
                <ul className="report-list">
                  {news.rareScarce.map((s) => (
                    <NewsRow key={s.report.ebirdCode} s={s} onGo={go} windowDays={14} />
                  ))}
                </ul>
              )}
              <p className="muted small">Rare for the area as flagged by eBird. Unconfirmed means a reviewer has not checked it yet.</p>
            </Panel>
            {news.unknownDrive > 0 && <p className="muted small">{news.unknownDrive} {news.unknownDrive === 1 ? 'place has' : 'places have'} no known drive time, so they are left out.</p>}
            <p className="muted small credit">{isDemo ? 'Demo data, invented for trying the app.' : <>Sightings: <a href="https://ebird.org" target="_blank" rel="noopener">eBird (ebird.org)</a>. Recent reports, not live positions.</>}</p>
          </>
        )}
      </main>
    </>
  )
}

function NewsRow({ s, onGo, windowDays }: { s: NewsSighting; onGo: (s: NewsSighting) => void; windowDays: number }) {
  const id = s.report.speciesId
  const src = id && dexById(id) ? birdSrc(id) : null
  return (
    <li className="report wanted-row">
      <button type="button" className="report-main as-button" onClick={() => onGo(s)}>
        {src ? <img src={src} width={40} height={40} alt="" /> : <span className="bird-blank" aria-hidden="true" />}
        <span>
          <strong>{s.report.name}</strong> {s.report.notable && <Pill tone="warn">{s.report.unconfirmed ? 'Rare · unconfirmed' : 'Rare'}</Pill>}
          <br />
          <span className="muted small">
            {shortSiteName(s.site.name)} · {daysAgo(s.report.obsDate)} · {s.minutes !== null ? `${s.minutes} min` : 'drive time unknown'}
          </span>
          {s.days !== undefined && s.days !== null && (
            <>
              <br />
              <ReliabilityStrip days={s.report.days} windowDays={windowDays} />
            </>
          )}
          {s.tip && <span className="muted small"><br />{s.tip}</span>}
        </span>
      </button>
      <a className="report-link small" href={`#/find/${encodeURIComponent(id ?? birdKey(s.report))}`}>Find ›</a>
    </li>
  )
}
