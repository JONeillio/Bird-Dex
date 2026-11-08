import { useState } from 'react'
import { dexById } from '../../data/catalogue'
import type { RegionData } from '../../data/published-schema'
import { DEX_SIZE } from '../../data/catalogue'
import { ageLabel, daysAgo, reportedCount, type SiteView } from '../../domain/ranking'
import { fullDesignation, shortSiteName } from '../../domain/siteName'
import { BottomSheet, DemoStamp, Pill } from '../../ui/components'
import { RadarSheet } from './RadarSheet'
import { birdSrc } from './birdArt'

export function SiteSheet({ view, region, startLabel, recorded, targets, onClose }: {
  view: SiteView | null
  region: RegionData
  startLabel: string
  recorded: ReadonlySet<string>
  targets: readonly string[]
  onClose: () => void
}) {
  const [radar, setRadar] = useState(false)
  if (!view) return null
  const { site, minutes } = view
  const dex = site.reports.filter((r) => r.speciesId)
  const other = site.reports.filter((r) => !r.speciesId)
  const [lng, lat] = site.point
  const designation = fullDesignation(site.name)
  const reported = reportedCount(site)
  const n = view.newIds.length
  return (
    <>
    {radar && <RadarSheet name={shortSiteName(site.name)} point={site.point} onClose={() => setRadar(false)} />}
    <BottomSheet open={!radar} onClose={onClose} title={shortSiteName(site.name)}>
      <div className="site-head">
        <h2 className="h-display site-name">{shortSiteName(site.name)}</h2>
        {region.isDemo && <DemoStamp />}
      </div>
      {designation && <p className="muted small site-designation">Listed on eBird as: {designation}</p>}
      <p className="site-facts">
        <strong>{minutes !== null ? `${minutes} min from ${startLabel}` : 'Drive time unknown'}</strong>
        <br />
        <strong>
          {n} of {reported} reported species new to you
        </strong>
        <br />
        <span className="muted small">
          New to you means reported here in the last {region.windowDays} days and not yet in your collection. Counted from the {DEX_SIZE}-bird Starter Dex; other birds are listed separately below.
        </span>
      </p>
      <p className="muted small">
        {region.isDemo ? 'Invented demo sightings' : `Updated ${ageLabel(region.generatedAt)}`}. Access unknown, check before you go. Birds move about: these are recent reports, not live positions.
      </p>
      <div className="row gap">
        <a className="btn primary small" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener">
          Directions
        </a>
        <button type="button" className="btn small" onClick={() => setRadar(true)}>
          Point me there
        </button>
        {site.url && (
          <a className="btn small" href={site.url} target="_blank" rel="noopener">
            View on eBird ↗
          </a>
        )}
      </div>

      <h3 className="sheet-sub">Reported here ({dex.length})</h3>
      {dex.length === 0 && <p className="muted">No Starter Dex birds reported here in this window.</p>}
      <ul className="report-list">
        {dex.map((r) => {
          const s = dexById(r.speciesId!)
          const src = birdSrc(r.speciesId!)
          const isNew = !recorded.has(r.speciesId!)
          return (
            <li key={r.ebirdCode} className="report">
              <a href={`#/bird/${r.speciesId}`} className="report-main">
                {src && <img src={src} width={40} height={40} alt="" />}
                <span>
                  <strong>{s?.name ?? r.name}</strong> {r.notable && <Pill tone="warn">{r.unconfirmed ? 'Rare · unconfirmed' : 'Rare'}</Pill>} {isNew && <Pill tone="warn">New to you</Pill>} {targets.includes(r.speciesId!) && <Pill>☆ Target</Pill>}
                  <br />
                  <span className="muted small">
                    Last reported {daysAgo(r.obsDate)}
                    {r.count ? ` · ${r.count} seen` : ''}
                  </span>
                </span>
              </a>
              <span className="report-actions">
                {r.checklistUrl && (
                  <a className="report-link small" href={r.checklistUrl} target="_blank" rel="noopener" aria-label={`eBird checklist for ${s?.name ?? r.name}`}>
                    eBird ↗
                  </a>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {other.length > 0 && (
        <details className="other-birds" open={other.some((r) => r.notable)}>
          <summary>Other birds ({other.length})</summary>
          <ul className="report-list">
            {other.map((r) => (
              <li key={r.ebirdCode} className="report">
                <span className="report-main">
                  <span>
                    {r.name} {r.notable && <Pill tone="warn">{r.unconfirmed ? 'Rare · unconfirmed' : 'Rare'}</Pill>}
                    <br />
                    <span className="muted small">Last reported {daysAgo(r.obsDate)}</span>
                  </span>
                </span>
                <span className="report-actions">
                  {r.checklistUrl && (
                    <a className="report-link small" href={r.checklistUrl} target="_blank" rel="noopener" aria-label={`eBird checklist for ${r.name}`}>
                      eBird ↗
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="muted small">Been here? Add your eBird export in <a href="#/journal">Journal</a> and your BirdDex updates in one go.</p>
      <p className="muted small credit">
        {region.isDemo ? 'Demo data, invented for trying the app.' : <>Sightings: <a href="https://ebird.org" target="_blank" rel="noopener">eBird (ebird.org)</a>.</>} Drive times © openrouteservice by HeiGIT | Data from OpenStreetMap.
      </p>
    </BottomSheet>
    </>
  )
}
