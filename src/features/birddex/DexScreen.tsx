import { useEffect, useMemo, useState } from 'react'
import { useTour } from '../../state/tour'
import { DEX_SIZE, STARTER_DEX } from '../../data/catalogue'
import { SETS, SET_LABELS, type SetId } from '../../data/schema'
import { useStore } from '../../state/store'
import { useRecords } from '../../state/records'
import { useRecorded } from '../../state/useRecorded'
import { useTilt } from '../../phone/tilt'
import { bondRun } from '../../domain/bond'
import { lifeList, outsideSpecies, yearList, type ListEntry } from '../../domain/dexLists'
import { Banner, Chip, DemoStamp, Pill, SampleStamp, Segmented } from '../../ui/components'
import { SettingsButton } from '../shell/SettingsButton'
import { BirdPortrait } from './BirdPortrait'
import { RankPips } from './RankPips'
import { FRAME_CLASS } from './rankFrames'
import { StatsPanel } from './StatsPanel'

type Filter = 'all' | 'targets' | 'near' | SetId
type Tab = 'dex' | 'year' | 'life' | 'stats'
/** A bird is "close to its next rank" within this many Bond points. */
const NEAR_POINTS = 8

export default function DexScreen() {
  const prefs = useStore((s) => s.prefs)
  const setPref = useStore((s) => s.setPref)
  const [tab, setTab] = useState<Tab>('dex')
  const [year] = useState(() => new Date().getFullYear())
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const recorded = useRecorded()
  const hasSample = useRecords((s) => s.encounters.some((e) => e.source === 'sample'))
  const encounters = useRecords((st) => st.encounters)
  const tiltRef = useTilt<HTMLElement>(prefs.tiltOn)
  const bonds = useMemo(() => bondRun(encounters).bonds, [encounters])
  const yearEntries = useMemo(() => yearList(encounters, year), [encounters, year])
  const lifeEntries = useMemo(() => lifeList(encounters), [encounters])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return STARTER_DEX.filter((s) => {
      if (filter === 'targets' && !prefs.targets.includes(s.id)) return false
      if (filter === 'near') {
        const b = bonds.get(s.id)
        if (!b || b.nextRankAt === null || b.nextRankAt - b.points > NEAR_POINTS) return false
      }
      if (filter !== 'all' && filter !== 'targets' && filter !== 'near' && !s.sets.includes(filter)) return false
      if (q && !s.name.toLowerCase().includes(q) && !s.sciName.toLowerCase().includes(q)) return false
      return true
    })
  }, [filter, query, prefs.targets, bonds])

  const count = STARTER_DEX.filter((s) => recorded.has(s.id)).length
  const setTourFacts = useTour((s) => s.setFacts)
  // Pearl only quotes your count once there is one ("0 of 104 so far" would sound like a telling-off).
  useEffect(() => setTourFacts({ recorded: count > 0 ? count : null, dexSize: DEX_SIZE }), [count, setTourFacts])
  const pct = Math.round((count / DEX_SIZE) * 100)
  const listEntries = tab === 'year' ? yearEntries : lifeEntries

  return (
    <>
      <Banner title="BirdDex" right={<SettingsButton />} />
      <main className="screen stack" ref={tiltRef}>
        <Segmented
          label="BirdDex view"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'dex', label: 'Dex' },
            { value: 'year', label: String(year) },
            { value: 'life', label: 'Life' },
            { value: 'stats', label: 'Stats' },
          ]}
        />
        {tab === 'dex' && (
          <>
            <div className="row spread" data-tour="dex-progress">
              <h2 className="h-display">Your BirdDex</h2>
              <Pill tone="good">
                {count} / {DEX_SIZE} recorded
              </Pill>
            </div>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={DEX_SIZE} aria-valuenow={count} aria-label="Birds recorded">
              <div style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
        {(tab === 'year' || tab === 'life') && (
          <div className="row spread">
            <h2 className="h-display">{tab === 'year' ? `Seen in ${year}` : 'Life list'}</h2>
            <Pill tone="good">{listEntries.length} {listEntries.length === 1 ? 'species' : 'species'}</Pill>
          </div>
        )}
        <div className="row">
          {hasSample && !prefs.demoCollection && <SampleStamp>Includes sample history</SampleStamp>}
          {tab === 'dex' && (prefs.demoCollection ? (
            <>
              <DemoStamp />
              <button type="button" className="linkish" onClick={() => setPref('demoCollection', false)}>
                Switch demo off
              </button>
            </>
          ) : (
            <button type="button" className="linkish" onClick={() => setPref('demoCollection', true)}>
              Preview with a demo collection
            </button>
          ))}
        </div>

        {tab === 'dex' && (
          <>
            <div className="chips" role="group" aria-label="Filter birds">
              <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
              {SETS.map((s) => (
                <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{SET_LABELS[s]}</Chip>
              ))}
              <Chip active={filter === 'near'} onClick={() => setFilter('near')}>Close to rank up</Chip>
              <Chip active={filter === 'targets'} onClick={() => setFilter('targets')} tone="coral">Targets</Chip>
            </div>

            <input
              className="search"
              type="search"
              placeholder="Search birds"
              aria-label="Search birds"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {shown.length === 0 ? (
              <p className="muted center">
                {filter === 'targets'
                  ? 'No targets yet. Open a bird and tap Target.'
                  : filter === 'near'
                    ? 'No bird is close to its next rank yet. Log the same bird in a new place, month or time of day to grow its bond.'
                    : 'No birds match that.'}
              </p>
            ) : (
              <div className="card-grid">
                {shown.map((s) => {
                  const isRecorded = recorded.has(s.id)
                  const bond = bonds.get(s.id)
                  return (
                    <a
                      key={s.id}
                      className={`card ${isRecorded ? 'foil' : ''} ${bond ? FRAME_CLASS[bond.rankIndex] : ''}`.trim()}
                      href={`#/bird/${s.id}`}
                    >
                      {isRecorded && <span className="tick" role="img" aria-label="Recorded">✓</span>}
                      {prefs.targets.includes(s.id) && <span className="target-dot" role="img" aria-label="Target">★</span>}
                      <BirdPortrait species={s} silhouette={!isRecorded} size={96} />
                      <span className="card-name">{s.name}</span>
                      <span className="dexno">#{String(s.dexNo).padStart(3, '0')}</span>
                      {bond && <RankPips rankIndex={bond.rankIndex} />}
                    </a>
                  )
                })}
              </div>
            )}
          </>
        )}

        {(tab === 'year' || tab === 'life') &&
          (listEntries.length === 0 ? (
            <p className="muted center">
              {tab === 'year'
                ? `No birds dated ${year} yet. Log a sighting or import your eBird history.`
                : 'Your life list is empty. Log a bird or import your eBird history and it fills in.'}
            </p>
          ) : (
            <div className="card-grid">
              {listEntries.map((e) => (
                <ListCard key={e.id} entry={e} rankIndex={bonds.get(e.id)?.rankIndex} showDate={tab === 'year'} />
              ))}
            </div>
          ))}

        {tab === 'stats' && <StatsPanel />}
      </main>
    </>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A recorded bird on the Year or Life list. Birds outside the Starter Dex get a generic portrait and no Dex number. */
function ListCard({ entry, rankIndex, showDate }: { entry: ListEntry; rankIndex: number | undefined; showDate: boolean }) {
  const species = entry.species ?? outsideSpecies(entry)
  const sub = showDate && entry.lastDate
    ? `${Number(entry.lastDate.slice(8, 10))} ${MONTHS[Number(entry.lastDate.slice(5, 7)) - 1]}`
    : entry.species
      ? `#${String(entry.species.dexNo).padStart(3, '0')}`
      : 'Outside the Dex'
  const inner = (
    <>
      <span className="tick" role="img" aria-label="Recorded">✓</span>
      <BirdPortrait species={species} size={96} />
      <span className="card-name">{entry.name}</span>
      <span className="dexno">{sub}</span>
      {rankIndex !== undefined && <RankPips rankIndex={rankIndex} />}
    </>
  )
  const cls = `card foil ${rankIndex !== undefined ? FRAME_CLASS[rankIndex] : ''}`.trim()
  return entry.species ? <a className={cls} href={`#/bird/${entry.id}`}>{inner}</a> : <div className={cls}>{inner}</div>
}
