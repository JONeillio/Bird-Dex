import { useMemo, useState } from 'react'
import { STARTER_DEX } from '../../data/catalogue'
import type { RegionData } from '../../data/published-schema'
import { birdIndex, rarities, searchBirds, type BirdHit } from '../../domain/findBird'
import { daysAgo } from '../../domain/ranking'
import { shortSiteName } from '../../domain/siteName'
import { BottomSheet, DemoStamp, Pill } from '../../ui/components'
import { birdSrc } from './birdArt'

const dexNames = new Map(STARTER_DEX.map((s) => [s.id, s.name]))

/**
 * "I want to see a Firecrest, where's it been?" Type any bird and get where it was reported in the window,
 * how recently and the nearest drive. Covers every reported bird, not only the Starter Dex, and lists eBird's
 * rarities when the box is empty. Choosing a bird focuses the map on the sites that reported it.
 */
export function FindBirdSheet({ region, startId, startLabel, recorded, onPick, onClose }: {
  region: RegionData
  startId: string
  startLabel: string
  recorded: ReadonlySet<string>
  onPick: (key: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const index = useMemo(() => birdIndex(region, startId), [region, startId])
  const hits = useMemo(() => searchBirds(index, q, dexNames).slice(0, 30), [index, q])
  const rare = useMemo(() => rarities(region, startId).slice(0, 12), [region, startId])

  return (
    <BottomSheet open onClose={onClose} title="Find a bird">
      <div className="site-head">
        <h2 className="h-display site-name">Find a bird</h2>
        {region.isDemo && <DemoStamp />}
      </div>
      <input
        className="search"
        type="search"
        autoFocus
        placeholder="Type a bird, e.g. firecrest"
        aria-label="Bird to find"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <p className="muted small">
        Searches every bird reported in the last {region.windowDays} days around {startLabel}, not only the BirdDex. Drive times from {startLabel}.
      </p>

      {q.trim() !== '' && (
        <>
          {hits.length === 0 && <p className="muted">No reports of that in the last {region.windowDays} days. Check the spelling, or try a nearby location.</p>}
          <ul className="report-list">
            {hits.map((h) => (
              <HitRow key={h.key} h={h} isNew={h.speciesId ? !recorded.has(h.speciesId) : false} onPick={onPick} />
            ))}
          </ul>
        </>
      )}

      {q.trim() === '' && (
        <>
          <h3 className="sheet-sub">Rarities{rare.length ? ` (${rare.length})` : ''}</h3>
          {rare.length === 0 ? (
            <p className="muted small">No rarities flagged around here in the last {region.windowDays} days.</p>
          ) : (
            <ul className="report-list">
              {rare.map(({ site, report, minutes }) => (
                <li key={`${site.id}-${report.ebirdCode}`} className="report">
                  <button type="button" className="report-main as-button" onClick={() => onPick(report.speciesId ?? `ebird:${report.ebirdCode}`)}>
                    <span>
                      <strong>{report.name}</strong> <Pill tone="warn">{report.unconfirmed ? 'Rare · unconfirmed' : 'Rare'}</Pill>
                      <br />
                      <span className="muted small">
                        {shortSiteName(site.name)} · {daysAgo(report.obsDate)} · {minutes !== null ? `${minutes} min` : 'drive time unknown'}
                      </span>
                    </span>
                  </button>
                  {report.checklistUrl && (
                    <a className="report-link small" href={report.checklistUrl} target="_blank" rel="noopener" aria-label={`eBird checklist for ${report.name}`}>
                      eBird ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="muted small">Rare for the area and time of year, as flagged by eBird. Unconfirmed means eBird's reviewers have not checked it yet.</p>
        </>
      )}
      <p className="muted small credit">
        {region.isDemo ? 'Demo data, invented for trying the app.' : <>Sightings: <a href="https://ebird.org" target="_blank" rel="noopener">eBird (ebird.org)</a>.</>}
      </p>
    </BottomSheet>
  )
}

function HitRow({ h, isNew, onPick }: { h: BirdHit; isNew: boolean; onPick: (key: string) => void }) {
  const src = h.speciesId ? birdSrc(h.speciesId) : null
  return (
    <li className="report">
      <button type="button" className="report-main as-button" onClick={() => onPick(h.key)}>
        {src ? <img src={src} width={40} height={40} alt="" /> : <span className="bird-blank" aria-hidden="true" />}
        <span>
          <strong>{h.name}</strong> {h.notable && <Pill tone="warn">Rare</Pill>} {isNew && <Pill tone="warn">New to you</Pill>}
          <br />
          <span className="muted small">
            {h.sites} {h.sites === 1 ? 'site' : 'sites'} · latest {daysAgo(h.latest)} · {h.nearestMin !== null ? `nearest ${h.nearestMin} min` : 'drive time unknown'}
          </span>
        </span>
      </button>
    </li>
  )
}
