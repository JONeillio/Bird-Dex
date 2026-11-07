import { dexById } from '../../data/catalogue'
import type { RegionData } from '../../data/published-schema'
import { ageLabel, daysAgo, type SiteView } from '../../domain/ranking'
import { BottomSheet, DemoStamp, Pill } from '../../ui/components'
import { birdSrc } from './birdArt'

export function SiteSheet({ view, region, startLabel, recorded, targets, onClose }: {
  view: SiteView | null
  region: RegionData
  startLabel: string
  recorded: ReadonlySet<string>
  targets: readonly string[]
  onClose: () => void
}) {
  if (!view) return null
  const { site, minutes } = view
  const dex = site.reports.filter((r) => r.speciesId)
  const other = site.reports.filter((r) => !r.speciesId)
  const [lng, lat] = site.point
  return (
    <BottomSheet open onClose={onClose} title={site.name}>
      <div className="site-head">
        <h2 className="h-display site-name">{site.name}</h2>
        {region.isDemo && <DemoStamp />}
      </div>
      <p className="site-facts">
        <strong>{minutes !== null ? `${minutes} min from ${startLabel}` : 'Drive time unknown'}</strong>
        <br />
        <span className="muted small">
          {region.isDemo ? 'Invented demo sightings' : `Updated ${ageLabel(region.generatedAt)}`} · reports from the last {region.windowDays} days
          <br />
          Access unknown, check before you go. Birds move about: these are recent reports, not live positions.
        </span>
      </p>
      <div className="row gap">
        <a className="btn primary small" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener">
          Directions
        </a>
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
                  <strong>{s?.name ?? r.name}</strong> {isNew && <Pill tone="warn">NEW</Pill>} {targets.includes(r.speciesId!) && <Pill>☆ Target</Pill>}
                  <br />
                  <span className="muted small">
                    Last reported {daysAgo(r.obsDate)}
                    {r.count ? ` · ${r.count} seen` : ''}
                  </span>
                </span>
              </a>
              {r.checklistUrl && (
                <a className="report-link small" href={r.checklistUrl} target="_blank" rel="noopener" aria-label={`eBird checklist for ${s?.name ?? r.name}`}>
                  eBird ↗
                </a>
              )}
            </li>
          )
        })}
      </ul>
      {other.length > 0 && (
        <details className="other-birds">
          <summary>Other birds ({other.length})</summary>
          <ul className="report-list">
            {other.map((r) => (
              <li key={r.ebirdCode} className="report">
                <span className="report-main">
                  <span>
                    {r.name}
                    <br />
                    <span className="muted small">Last reported {daysAgo(r.obsDate)}</span>
                  </span>
                </span>
                {r.checklistUrl && (
                  <a className="report-link small" href={r.checklistUrl} target="_blank" rel="noopener">
                    eBird ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="muted small credit">
        {region.isDemo ? 'Demo data, invented for trying the app.' : <>Sightings: <a href="https://ebird.org" target="_blank" rel="noopener">eBird (ebird.org)</a>.</>} Drive times © openrouteservice by HeiGIT | Data from OpenStreetMap.
      </p>
    </BottomSheet>
  )
}
