import { useMemo, useState } from 'react'
import { formatDate } from '../../domain/journal'
import { useRecords } from '../../state/records'
import { useUi } from '../../state/ui'
import { Panel, SampleStamp } from '../../ui/components'

const fmt = (n: number) => n.toLocaleString('en-GB')

/** Past imports with a way to undo each one. Only sightings from that import are removed. */
export function ImportsPanel() {
  const encounters = useRecords((s) => s.encounters)
  const batches = useRecords((s) => s.batches)
  const undoBatch = useRecords((s) => s.undoBatch)
  const say = useUi((s) => s.say)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of encounters) if (e.importBatchId) m.set(e.importBatchId, (m.get(e.importBatchId) ?? 0) + 1)
    return m
  }, [encounters])
  const live = batches.filter((b) => (counts.get(b.id) ?? 0) > 0)
  if (live.length === 0) return null

  return (
    <Panel className="stack tight">
      <strong>Imports</strong>
      <ul className="imports-list">
        {live.map((b) => {
          const n = counts.get(b.id) ?? 0
          const sample = b.source === 'sample'
          return (
            <li key={b.id} className="stack tight">
              <span className="row gap">
                <span>{sample ? 'Sample history' : b.fileName}</span>
                {sample && <SampleStamp>Made up</SampleStamp>}
              </span>
              <span className="muted small">
                {fmt(n)} {n === 1 ? 'sighting' : 'sightings'} · added {formatDate(b.date.slice(0, 10))}
              </span>
              {confirmId === b.id ? (
                <span className="stack tight">
                  <span className="small">
                    Remove {fmt(n)} {n === 1 ? 'sighting' : 'sightings'}? Sightings you logged yourself are not touched.
                  </span>
                  <span className="row gap">
                    <button
                      type="button"
                      className="btn small primary"
                      onClick={async () => {
                        setConfirmId(null)
                        const removed = await undoBatch(b.id)
                        say(`Removed ${fmt(removed)} ${removed === 1 ? 'sighting' : 'sightings'}`)
                      }}
                    >
                      Yes, remove
                    </button>
                    <button type="button" className="btn small" onClick={() => setConfirmId(null)}>
                      Keep
                    </button>
                  </span>
                </span>
              ) : (
                <button type="button" className="btn small" onClick={() => setConfirmId(b.id)}>
                  {sample ? 'Remove sample history' : 'Remove this import'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
