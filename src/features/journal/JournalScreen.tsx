import { useMemo, useState } from 'react'
import { dexById } from '../../data/catalogue'
import { MODE_LABELS } from '../../data/personal-schema'
import { backupDue, formatDate, sortEncounters } from '../../domain/journal'
import { groupOutings } from '../../domain/outings'
import { useParcels } from '../../state/parcels'
import { Banner, Panel, Pill, SampleStamp } from '../../ui/components'
import { useRecords } from '../../state/records'
import { useStore } from '../../state/store'
import { useUi } from '../../state/ui'
import { BirdPortrait } from '../birddex/BirdPortrait'
import { SettingsButton } from '../shell/SettingsButton'
import { ImportFlow } from './ImportFlow'
import { ImportsPanel } from './ImportsPanel'

const PAGE = 100

export default function JournalScreen() {
  const encounters = useRecords((s) => s.encounters)
  const status = useRecords((s) => s.status)
  const warning = useRecords((s) => s.warning)
  const remove = useRecords((s) => s.remove)
  const openLog = useUi((s) => s.openLog)
  const say = useUi((s) => s.say)
  const last = useStore((s) => s.prefs.lastBackupAt)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [shown, setShown] = useState(PAGE)
  const sorted = useMemo(() => sortEncounters(encounters), [encounters])
  const species = new Set(encounters.map((e) => e.speciesId)).size
  const parcels = useParcels()
  const outings = useMemo(() => groupOutings(encounters), [encounters])
  const [outingsShown, setOutingsShown] = useState(8)

  return (
    <>
      <Banner title="Journal" right={<SettingsButton />} />
      <main className="screen stack">
        {warning && (
          <Panel>
            <p role="alert">{warning}</p>
          </Panel>
        )}
        <div className="row spread">
          <h2 className="h-display">Your sightings</h2>
          <span className="row gap">
            <button type="button" className="btn small" onClick={() => setImporting(true)}>
              Import
            </button>
            <button type="button" className="btn primary small" onClick={() => openLog()}>
              + Log
            </button>
          </span>
        </div>
        {encounters.length > 0 && (
          <p className="muted">
            {encounters.length.toLocaleString('en-GB')} {encounters.length === 1 ? 'sighting' : 'sightings'} · {species.toLocaleString('en-GB')} {species === 1 ? 'species' : 'species'}
          </p>
        )}
        {backupDue(encounters.length, last) && (
          <Panel className="stack tight">
            <strong>Back up your sightings</strong>
            <p className="muted small">They live only on this phone. A backup file keeps them safe if the phone is lost or reset.</p>
            <a className="btn small" href="#/settings">
              Go to backup
            </a>
          </Panel>
        )}
        {parcels.length > 0 && (
          <Panel className="stack tight parcels-panel">
            <h3 className="h-display">{parcels.length === 1 ? '1 new parcel' : `${parcels.length} new parcels`}</h3>
            <p className="muted small">Open one to see how your day went.</p>
            <ul className="outing-list">
              {parcels.slice(0, 5).map((o) => (
                <li key={o.key}>
                  <a className="outing-link" href={`#/report/${encodeURIComponent(o.key)}`}>
                    <span>
                      <strong>{o.place || 'Somewhere not named'}</strong>
                      <span className="muted small"> · {formatDate(o.date)} · {o.species.length} {o.species.length === 1 ? 'species' : 'species'}</span>
                    </span>
                    <span className="btn small primary" aria-hidden="true">Open</span>
                  </a>
                </li>
              ))}
            </ul>
            {parcels.length > 5 && <p className="muted small">And {parcels.length - 5} more below in Past outings.</p>}
          </Panel>
        )}
        {outings.length > 0 && (
          <Panel className="stack tight">
            <h3 className="h-display">Past outings</h3>
            <ul className="outing-list">
              {outings.slice(0, outingsShown).map((o) => (
                <li key={o.key}>
                  <a className="outing-link" href={`#/report/${encodeURIComponent(o.key)}`}>
                    <span>
                      <strong>{o.place || 'Somewhere not named'}</strong>
                      <span className="muted small"> · {formatDate(o.date)} · {o.species.length} {o.species.length === 1 ? 'species' : 'species'}</span>
                    </span>
                    <span className="small" aria-hidden="true">Report ›</span>
                  </a>
                </li>
              ))}
            </ul>
            {outings.length > outingsShown && (
              <button type="button" className="btn small" onClick={() => setOutingsShown(outingsShown + 10)}>
                Show more
              </button>
            )}
          </Panel>
        )}
        <ImportsPanel />
        {status === 'loading' && <p className="muted">Loading…</p>}
        {status === 'ready' && encounters.length === 0 && (
          <Panel className="coming stack">
            <h3 className="h-display">Nothing logged yet</h3>
            <p className="muted">Log a bird you have seen or heard and it appears in your BirdDex in colour.</p>
            <button type="button" className="btn primary" onClick={() => openLog()}>
              Log your first sighting
            </button>
          </Panel>
        )}
        <ul className="journal-list">
          {sorted.slice(0, shown).map((e) => {
            const s = dexById(e.speciesId)
            const label = s?.name ?? e.name ?? e.speciesId
            return (
              <li key={e.id} className="journal-item">
                {s ? (
                  <a href={`#/bird/${e.speciesId}`} className="journal-bird" aria-label={label}>
                    <BirdPortrait species={s} size={56} />
                  </a>
                ) : (
                  <span className="journal-bird" aria-hidden="true" />
                )}
                <div className="journal-main">
                  <strong>{label}</strong>
                  <span className="muted small">
                    {formatDate(e.date)}
                    {e.time ? ` · ${e.time}` : ''}
                    {e.place ? ` · ${e.place}` : ''}
                  </span>
                  <span className="row">
                    <Pill>{MODE_LABELS[e.mode]}</Pill>
                    {!s && <Pill>Outside the Starter Dex</Pill>}
                    {e.source === 'sample' && <SampleStamp />}
                  </span>
                  {e.notes && <span className="small">{e.notes}</span>}
                  {e.photo && <img className="journal-photo" src={e.photo} alt={`Your photo of ${s?.name ?? 'the bird'}`} />}
                </div>
                <span className="report-actions">
                <button type="button" className="btn small" onClick={() => openLog({ edit: e })} aria-label={`Edit ${label} sighting`}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn small ghost"
                  onClick={() => {
                    if (confirmId === e.id) {
                      setConfirmId(null)
                      void remove(e.id)
                      say('Sighting deleted.')
                    } else setConfirmId(e.id)
                  }}
                >
                  {confirmId === e.id ? 'Tap to delete' : 'Delete'}
                </button>
                </span>
              </li>
            )
          })}
        </ul>
        {sorted.length > shown && (
          <button type="button" className="btn block" onClick={() => setShown(shown + PAGE)}>
            Show {Math.min(PAGE, sorted.length - shown)} more ({(sorted.length - shown).toLocaleString('en-GB')} left)
          </button>
        )}
        {importing && <ImportFlow onClose={() => setImporting(false)} />}
      </main>
    </>
  )
}
