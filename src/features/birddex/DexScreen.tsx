import { useMemo, useState } from 'react'
import { DEX_SIZE, STARTER_DEX } from '../../data/catalogue'
import { SETS, SET_LABELS, type SetId } from '../../data/schema'
import { recordedIds } from '../../domain/collection'
import { useStore } from '../../state/store'
import { Banner, Chip, DemoStamp, Pill } from '../../ui/components'
import { SettingsButton } from '../shell/SettingsButton'
import { BirdPortrait } from './BirdPortrait'

type Filter = 'all' | 'targets' | SetId

export default function DexScreen() {
  const prefs = useStore((s) => s.prefs)
  const setPref = useStore((s) => s.setPref)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const recorded = useMemo(() => recordedIds(prefs), [prefs])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return STARTER_DEX.filter((s) => {
      if (filter === 'targets' && !prefs.targets.includes(s.id)) return false
      if (filter !== 'all' && filter !== 'targets' && !s.sets.includes(filter)) return false
      if (q && !s.name.toLowerCase().includes(q) && !s.sciName.toLowerCase().includes(q)) return false
      return true
    })
  }, [filter, query, prefs.targets])

  const count = STARTER_DEX.filter((s) => recorded.has(s.id)).length
  const pct = Math.round((count / DEX_SIZE) * 100)

  return (
    <>
      <Banner title="BirdDex" right={<SettingsButton />} />
      <main className="screen stack">
        <div className="row spread">
          <h2 className="h-display">Your BirdDex</h2>
          <Pill tone="good">
            {count} / {DEX_SIZE} recorded
          </Pill>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={DEX_SIZE} aria-valuenow={count} aria-label="Birds recorded">
          <div style={{ width: `${pct}%` }} />
        </div>
        <div className="row">
          {prefs.demoCollection ? (
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
          )}
        </div>

        <div className="chips" role="group" aria-label="Filter birds">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
          {SETS.map((s) => (
            <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{SET_LABELS[s]}</Chip>
          ))}
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
            {filter === 'targets' ? 'No targets yet. Open a bird and tap Target.' : 'No birds match that.'}
          </p>
        ) : (
          <div className="card-grid">
            {shown.map((s) => {
              const isRecorded = recorded.has(s.id)
              return (
                <a key={s.id} className="card" href={`#/bird/${s.id}`}>
                  {isRecorded && <span className="tick" role="img" aria-label="Recorded">✓</span>}
                  {prefs.targets.includes(s.id) && <span className="target-dot" role="img" aria-label="Target">★</span>}
                  <BirdPortrait species={s} silhouette={!isRecorded} size={96} />
                  <span className="card-name">{s.name}</span>
                  <span className="dexno">#{String(s.dexNo).padStart(3, '0')}</span>
                </a>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
