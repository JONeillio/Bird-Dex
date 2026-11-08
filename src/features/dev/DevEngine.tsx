import { useMemo } from 'react'
import { dexById } from '../../data/catalogue'
import { usePublished } from '../../data/published'
import { computeBond } from '../../domain/bond'
import { exploration, visitedSiteIds } from '../../domain/explore'
import { allFieldReports, type FieldReport } from '../../domain/fieldReport'
import { buildRarity, RARITY_LABELS, rarityOf, sciNameFor, type RarityTier } from '../../domain/rarity'
import { collectionStats } from '../../domain/stats'
import { useRecords } from '../../state/records'
import { useStore } from '../../state/store'
import { Banner, Panel } from '../../ui/components'
import { BackButton } from '../shell/SettingsButton'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const shortDate = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`
const TIERS: RarityTier[] = ['rare', 'scarce', 'uncommon', 'fairly-common', 'common', 'unreported', 'unknown']

function todayLocal(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function reportLine(r: FieldReport, nameOf: (key: string) => string): string {
  const p = r.points
  const par = r.par ? `par ${r.par.par}, found ${r.par.found}, +${r.par.extra.length}` : 'par —'
  const best = r.bestBird ? nameOf(r.bestBird) : '—'
  return `${shortDate(r.date)} · ${r.place || 'Unknown place'} · ${r.speciesCount} species · ${p.total} pts (rarity ${p.rarity}, lifers ${p.lifers}, firsts ${p.firstsOfYear}, bond ${p.bond}${p.explorer ? `, explorer ${p.explorer}` : ''}) · best: ${best} · ${par}${r.sample ? ' · sample' : ''}`
}

/** #/dev/engine: a plain readout of the game engines so the numbers can be checked on a phone. */
export default function DevEngine() {
  const encounters = useRecords((s) => s.encounters)
  const status = useRecords((s) => s.status)
  const regionId = useStore((s) => s.prefs.regionId)
  const startId = useStore((s) => s.prefs.startId)
  const data = usePublished(regionId)
  const region = data.status === 'ready' ? data.region : null

  const calc = useMemo(() => {
    const rarity = buildRarity(region)
    const reports = allFieldReports(encounters, { rarity, region })
    const bond = computeBond(encounters)
    const stats = collectionStats(encounters, reports, bond, rarity, todayLocal())
    const tierCounts = new Map<RarityTier, number>()
    const seen = new Map<string, string | null>()
    for (const e of encounters) if (!seen.has(e.speciesId)) seen.set(e.speciesId, sciNameFor(e.speciesId, e.sciName))
    for (const sci of seen.values()) {
      const t = rarityOf(rarity, sci).tier
      tierCounts.set(t, (tierCounts.get(t) ?? 0) + 1)
    }
    const names = new Map<string, string>()
    for (const e of encounters) if (!names.has(e.speciesId)) names.set(e.speciesId, dexById(e.speciesId)?.name ?? e.name ?? e.speciesId)
    let explore = null
    if (region) {
      const start = startId in region.drive.byStart ? startId : (Object.keys(region.drive.byStart)[0] ?? startId)
      explore = { start, ...exploration(region, visitedSiteIds(encounters), start) }
    }
    return { rarity, reports, bond, stats, tierCounts, names, explore }
  }, [encounters, region, startId])

  const nameOf = (key: string) => calc.names.get(key) ?? dexById(key)?.name ?? key
  const { stats, reports, explore } = calc

  return (
    <>
      <Banner title="Dev: engine" left={<BackButton to="#/settings" />} />
      <main className="screen stack">
        {status === 'loading' ? (
          <p className="muted">Loading your records…</p>
        ) : (
          <>
            <p className="muted">
              {stats.sample ? 'Includes sample history (made up; it never earns badges). ' : 'Your own records only. '}
              Rarity is based on {region ? `the last ${region.windowDays} days of ${region.isDemo ? 'demo ' : ''}reports for ${regionId}` : 'no region data yet, so every bird is worth 1'}.
            </p>

            <Panel className="stack">
              <h2 className="h-display small-h">Totals</h2>
              <p>
                {stats.totals.sightings} sightings · {stats.totals.species} species ({stats.totals.dexSpecies} in the Starter Dex) · {stats.totals.outings} outings · {stats.totals.sites} places
              </p>
              <p>Streak: {stats.streak.currentWeeks} week{stats.streak.currentWeeks === 1 ? '' : 's'} now, best {stats.streak.bestWeeks}</p>
              <p>
                Birds by rarity:{' '}
                {TIERS.filter((t) => calc.tierCounts.get(t)).map((t) => `${RARITY_LABELS[t]} ${calc.tierCounts.get(t)}`).join(' · ') || 'none yet'}
              </p>
              <p>
                Years:{' '}
                {stats.years.map((y) => `${y.year}: ${y.species} species, ${y.lifers} lifer${y.lifers === 1 ? '' : 's'}, ${y.outings} outing${y.outings === 1 ? '' : 's'}`).join(' · ') || 'none yet'}
              </p>
            </Panel>

            <Panel className="stack">
              <h2 className="h-display small-h">Most seen</h2>
              {stats.mostSeen.length === 0 ? <p className="muted">None yet.</p> : <ol>{stats.mostSeen.slice(0, 5).map((b) => <li key={b.key}>{b.name}: {b.sightings} sighting{b.sightings === 1 ? '' : 's'}</li>)}</ol>}
              <h2 className="h-display small-h">Top Bond</h2>
              {stats.topBond.length === 0 ? <p className="muted">None yet.</p> : <ol>{stats.topBond.slice(0, 5).map((b) => <li key={b.key}>{b.name}: {b.points} ({b.rank})</li>)}</ol>}
              <h2 className="h-display small-h">Coolest birds</h2>
              {stats.coolest.length === 0 ? <p className="muted">None yet.</p> : <ol>{stats.coolest.slice(0, 5).map((b) => <li key={b.key}>{b.name}: {b.points} ({RARITY_LABELS[b.tier]}, {b.sightings} seen)</li>)}</ol>}
            </Panel>

            <Panel className="stack">
              <h2 className="h-display small-h">Latest Field Reports</h2>
              {reports.length === 0 ? (
                <p className="muted">No dated outings yet. Import a history or log a sighting.</p>
              ) : (
                <ol>{reports.slice(0, 5).map((r) => <li key={r.outingKey}>{reportLine(r, nameOf)}</li>)}</ol>
              )}
              <h2 className="h-display small-h">Best outings</h2>
              {stats.bestOutings.length === 0 ? <p className="muted">None yet.</p> : <ol>{stats.bestOutings.map((r) => <li key={r.outingKey}>{shortDate(r.date)} {r.date.slice(0, 4)} · {r.place || 'Unknown place'} · {r.points.total} pts</li>)}</ol>}
            </Panel>

            <Panel className="stack">
              <h2 className="h-display small-h">Exploring</h2>
              {explore ? (
                <>
                  <p>
                    Explored {explore.explored.length} of {explore.total} spots ({Math.round(explore.share * 100)}%), driving from {explore.start}
                  </p>
                  {explore.nearestUnexplored.length === 0 ? (
                    <p className="muted">No unexplored spots with a known drive time.</p>
                  ) : (
                    <ol>{explore.nearestUnexplored.map((s) => <li key={s.siteId}>{s.siteId}: {s.minutes} min</li>)}</ol>
                  )}
                </>
              ) : (
                <p className="muted">No region data loaded.</p>
              )}
            </Panel>
          </>
        )}
      </main>
    </>
  )
}
