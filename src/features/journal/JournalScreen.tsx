import { useMemo, useState } from 'react'
import { dexById } from '../../data/catalogue'
import { MODE_LABELS } from '../../data/personal-schema'
import { backupDue, formatDate, sortEncounters } from '../../domain/journal'
import { Banner, Panel, Pill } from '../../ui/components'
import { useRecords } from '../../state/records'
import { useStore } from '../../state/store'
import { useUi } from '../../state/ui'
import { BirdPortrait } from '../birddex/BirdPortrait'
import { SettingsButton } from '../shell/SettingsButton'

export default function JournalScreen() {
  const encounters = useRecords((s) => s.encounters)
  const status = useRecords((s) => s.status)
  const warning = useRecords((s) => s.warning)
  const remove = useRecords((s) => s.remove)
  const openLog = useUi((s) => s.openLog)
  const say = useUi((s) => s.say)
  const last = useStore((s) => s.prefs.lastBackupAt)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const sorted = useMemo(() => sortEncounters(encounters), [encounters])
  const species = new Set(encounters.map((e) => e.speciesId)).size

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
          <button type="button" className="btn primary small" onClick={() => openLog()}>
            + Log
          </button>
        </div>
        {encounters.length > 0 && (
          <p className="muted">
            {encounters.length} {encounters.length === 1 ? 'sighting' : 'sightings'} · {species} {species === 1 ? 'species' : 'species'}
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
          {sorted.map((e) => {
            const s = dexById(e.speciesId)
            return (
              <li key={e.id} className="journal-item">
                <a href={`#/bird/${e.speciesId}`} className="journal-bird" aria-label={s?.name ?? e.speciesId}>
                  {s ? <BirdPortrait species={s} size={56} /> : null}
                </a>
                <div className="journal-main">
                  <strong>{s?.name ?? e.speciesId}</strong>
                  <span className="muted small">
                    {formatDate(e.date)}
                    {e.place ? ` · ${e.place}` : ''}
                  </span>
                  <span className="row">
                    <Pill>{MODE_LABELS[e.mode]}</Pill>
                  </span>
                  {e.notes && <span className="small">{e.notes}</span>}
                  {e.photo && <img className="journal-photo" src={e.photo} alt={`Your photo of ${s?.name ?? 'the bird'}`} />}
                </div>
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
              </li>
            )
          })}
        </ul>
      </main>
    </>
  )
}
