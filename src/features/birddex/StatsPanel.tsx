import { useMemo, useState } from 'react'
import { usePublished } from '../../data/published'
import { bondRun } from '../../domain/bond'
import { localDate } from '../../domain/callIt'
import { allFieldReports } from '../../domain/fieldReport'
import { buildRarity, RARITY_LABELS } from '../../domain/rarity'
import { collectionStats } from '../../domain/stats'
import { useRecords } from '../../state/records'
import { useStore } from '../../state/store'
import { Panel } from '../../ui/components'
import { MarkImg } from '../../ui/MarkImg'
import { tierMarkFor } from '../../art/marks'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const shortDate = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`

/** Totals, favourites, years, best outings and your weekly streak, all worked out from your own sightings. */
export function StatsPanel() {
  const encounters = useRecords((s) => s.encounters)
  const regionId = useStore((s) => s.prefs.regionId)
  const data = usePublished(regionId)
  const [today] = useState(() => localDate(new Date()))
  const region = data.status === 'ready' ? data.region : null
  const stats = useMemo(() => {
    const rarity = buildRarity(region)
    const reports = allFieldReports(encounters, { rarity, region })
    return collectionStats(encounters, reports, bondRun(encounters).bonds, rarity, today)
  }, [encounters, region, today])

  if (stats.totals.sightings === 0) {
    return <p className="muted center">Nothing to count yet. Log a bird or import your eBird history and your numbers appear here.</p>
  }
  const t = stats.totals
  return (
    <div className="stack">
      {stats.sample && <p className="muted">Includes sample history, so these numbers are for show.</p>}
      <div className="stat-tiles">
        <Tile n={t.species} label="species" />
        <Tile n={t.sightings} label="sightings" />
        <Tile n={t.outings} label="outings" />
        <Tile n={t.sites} label="places" />
      </div>
      <Panel>
        <h3 className="h-display">Weekly streak</h3>
        <p>
          {stats.streak.currentWeeks === 0 ? 'No outing this week or last.' : `${stats.streak.currentWeeks} week${stats.streak.currentWeeks === 1 ? '' : 's'} in a row.`}{' '}
          <span className="muted">Best: {stats.streak.bestWeeks}.</span>
        </p>
      </Panel>
      <Panel>
        <h3 className="h-display">Most seen</h3>
        <ol className="rank-list">
          {stats.mostSeen.slice(0, 5).map((b) => (
            <li key={b.key}><span>{b.name}</span><b>{b.sightings}</b></li>
          ))}
        </ol>
      </Panel>
      <Panel>
        <h3 className="h-display">Closest friends</h3>
        <ol className="rank-list">
          {stats.topBond.slice(0, 5).map((b) => (
            <li key={b.key}><span>{b.name}</span><b>{b.rank}</b></li>
          ))}
        </ol>
      </Panel>
      <Panel>
        <h3 className="h-display">Coolest finds</h3>
        <ol className="rank-list">
          {stats.coolest.slice(0, 5).map((b) => {
            const mark = tierMarkFor(b.tier)
            return (
              <li key={b.key}>
                <span>{b.name}</span>
                <b className="tier-tag">{mark && <MarkImg mark={mark} scale={1} />} {RARITY_LABELS[b.tier]}</b>
              </li>
            )
          })}
        </ol>
      </Panel>
      {stats.years.length > 0 && (
        <Panel>
          <h3 className="h-display">Years</h3>
          <ol className="rank-list">
            {stats.years.map((y) => (
              <li key={y.year}><span>{y.year}</span><b>{y.species} species · {y.outings} outings</b></li>
            ))}
          </ol>
        </Panel>
      )}
      {stats.bestOutings.length > 0 && (
        <Panel>
          <h3 className="h-display">Best outings</h3>
          <ol className="rank-list">
            {stats.bestOutings.slice(0, 5).map((r) => (
              <li key={r.outingKey}>
                <a href={`#/report/${encodeURIComponent(r.outingKey)}`}>{r.place || 'Somewhere'}, {shortDate(r.date)}</a>
                <b>{r.points.total} pts</b>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  )
}

function Tile({ n, label }: { n: number; label: string }) {
  return (
    <div className="stat-tile">
      <b>{n.toLocaleString('en-GB')}</b>
      <span>{label}</span>
    </div>
  )
}
