import { useMemo, useState } from 'react'
import { STARTER_DEX } from '../../data/catalogue'
import { traitsById } from '../../data/game'
import { generateSampleHistory } from '../../data/importers/sample-history'
import { parseEbirdCsv, parseEbirdFile, planEbirdImport, rowsToEncounters, type ImportPlan } from '../../data/importers/ebird-csv'
import type { ImportBatch } from '../../data/personal-schema'
import { todayIso } from '../../domain/collection'
import { newEncounterId, useRecords } from '../../state/records'
import { useStore } from '../../state/store'
import { BottomSheet } from '../../ui/components'

const fmt = (n: number) => n.toLocaleString('en-GB')
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`
const dexBySci = new Map(STARTER_DEX.map((s) => [s.sciName, s.id]))
const SHOW_REVIEW = 40
const SAMPLE_NAME = 'Sample history (made up)'

type Phase =
  | { step: 'pick'; error?: string }
  | { step: 'reading'; fraction: number }
  | { step: 'preview'; plan: ImportPlan; fileName: string; rowCount: number; sample?: boolean }
  | { step: 'writing'; fraction: number }
  | { step: 'done'; added: number; dexSpecies: number; otherSpecies: number; demoSwitchedOff: boolean; sample?: boolean }

/** Import from eBird's "Download My Data" file. Everything happens on this phone; the file is never uploaded. */
export function ImportFlow({ onClose }: { onClose: () => void }) {
  const encounters = useRecords((s) => s.encounters)
  const addMany = useRecords((s) => s.addMany)
  const prefs = useStore((s) => s.prefs)
  const setPref = useStore((s) => s.setPref)
  const [phase, setPhase] = useState<Phase>({ step: 'pick' })
  const existingKeys = useMemo(() => new Set(encounters.flatMap((e) => (e.importKey ? [e.importKey] : []))), [encounters])
  const busy = phase.step === 'reading' || phase.step === 'writing'

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setPhase({ step: 'reading', fraction: 0 })
    const res = await parseEbirdFile(file, { dexBySci, today: todayIso() }, (fraction) => setPhase({ step: 'reading', fraction }))
    if (!res.ok) return setPhase({ step: 'pick', error: res.error })
    setPhase({ step: 'preview', plan: planEbirdImport(res.parsed, existingKeys), fileName: file.name, rowCount: res.parsed.totalRows })
  }

  /** The made-up history goes through exactly the same parse and plan as a real file. */
  const onSample = () => {
    const today = todayIso()
    const csv = generateSampleHistory({ species: STARTER_DEX, traitsOf: traitsById, today })
    const res = parseEbirdCsv(csv, { dexBySci, today })
    if (!res.ok) return setPhase({ step: 'pick', error: res.error })
    setPhase({ step: 'preview', plan: planEbirdImport(res.parsed, existingKeys), fileName: SAMPLE_NAME, rowCount: res.parsed.totalRows, sample: true })
  }

  const run = async (plan: ImportPlan, fileName: string, rowCount: number, sample = false) => {
    const batchId = `imp-${Date.now().toString(36)}`
    const now = new Date().toISOString()
    const batch: ImportBatch = { id: batchId, source: sample ? 'sample' : 'ebird', fileName: fileName.slice(0, 120), rowCount, importedCount: plan.toAdd.length, date: now }
    setPhase({ step: 'writing', fraction: 0 })
    await addMany(rowsToEncounters(plan.toAdd, batchId, now, newEncounterId, sample ? 'sample' : 'ebird'), batch, (fraction) => setPhase({ step: 'writing', fraction }))
    // Same as logging: demo data hides real records, so switch it off to let the import show.
    const wasDemo = prefs.demoCollection
    if (wasDemo) setPref('demoCollection', false)
    setPhase({ step: 'done', added: plan.toAdd.length, dexSpecies: plan.dexSpecies, otherSpecies: plan.otherSpecies, demoSwitchedOff: wasDemo, sample })
  }

  return (
    <BottomSheet open onClose={() => !busy && onClose()} title="Import from eBird">
      <h2 className="h-display site-name">Import from eBird</h2>

      {phase.step === 'pick' && (
        <div className="stack">
          <p>Bring your eBird history in so your BirdDex starts with the birds you have already seen.</p>
          <ol className="small import-steps">
            <li>On ebird.org, open My eBird, then Download My Data. eBird emails you a file.</li>
            <li>The email holds a ZIP. Open it on your phone and extract <strong>MyEBirdData.csv</strong>.</li>
            <li>Choose that file below.</li>
          </ol>
          <p className="muted small">The file is read on this phone and never uploaded. Only the bird, date, time and site name are kept: no map positions, comments or other people&apos;s details.</p>
          {phase.error && (
            <p className="form-error" role="alert">
              {phase.error}
            </p>
          )}
          <label className="btn primary block photo-btn">
            Choose your eBird file
            <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
          <hr className="rule" />
          <p className="muted small">No file to hand? Try a made-up history to see how imports, lists and ranks work. It is labelled &ldquo;Sample&rdquo; everywhere and you can remove it afterwards.</p>
          <button type="button" className="btn block" onClick={onSample}>
            Try a sample history
          </button>
        </div>
      )}

      {(phase.step === 'reading' || phase.step === 'writing') && (
        <div className="stack" role="status">
          <p>{phase.step === 'reading' ? 'Reading your file…' : 'Saving your sightings…'}</p>
          <div className="progress" aria-hidden="true">
            <div style={{ width: `${Math.round(phase.fraction * 100)}%` }} />
          </div>
          <p className="muted small">{Math.round(phase.fraction * 100)}%. Keep this screen open.</p>
        </div>
      )}

      {phase.step === 'preview' && (
        <div className="stack">
          <p className="muted small">{phase.fileName}</p>
          {phase.sample && <p className="import-note">Made-up sightings at invented &ldquo;Sample&rdquo; sites, from January 2024 to today. Nothing here is real. It shows how lists and ranks work, and it never earns badges.</p>}
          {phase.plan.toAdd.length === 0 ? (
            <p>
              <strong>Nothing new to add.</strong> {phase.plan.alreadyImported > 0 ? 'Everything in this file is already on this phone.' : 'No usable sightings were found.'}
            </p>
          ) : (
            <ul className="import-counts">
              <li>
                <strong>{plural(phase.plan.dexSpecies, 'Starter Dex bird', 'Starter Dex birds')}</strong> · {plural(phase.plan.dexSightings, 'sighting', 'sightings')}
              </li>
              <li>
                <strong>{plural(phase.plan.otherSpecies, 'other bird', 'other birds')}</strong> · {plural(phase.plan.otherSightings, 'sighting', 'sightings')} (kept for your life list)
              </li>
            </ul>
          )}
          {phase.plan.alreadyImported > 0 && phase.plan.toAdd.length > 0 && <p className="muted small">{plural(phase.plan.alreadyImported, 'sighting is', 'sightings are')} already on this phone and will be skipped.</p>}
          {phase.plan.review.length > 0 && (
            <details className="other-birds">
              <summary>{plural(phase.plan.review.length, 'row needs', 'rows need')} a look, so will not be imported</summary>
              <ul className="small import-review">
                {phase.plan.review.slice(0, SHOW_REVIEW).map((r) => (
                  <li key={r.line}>
                    Line {r.line}: {r.name}
                    {r.date ? ` (${r.date})` : ''} · {r.reason}
                  </li>
                ))}
              </ul>
              {phase.plan.review.length > SHOW_REVIEW && <p className="muted small">…and {fmt(phase.plan.review.length - SHOW_REVIEW)} more.</p>}
            </details>
          )}
          {!phase.sample && <p className="muted small">eBird does not say whether a bird was seen or heard, so these are saved as &ldquo;Seen&rdquo;. You can edit any of them later.</p>}
          <button type="button" className="btn primary block" disabled={phase.plan.toAdd.length === 0} onClick={() => void run(phase.plan, phase.fileName, phase.rowCount, phase.sample)}>
            {phase.plan.toAdd.length === 0 ? 'Nothing to import' : `${phase.sample ? 'Add sample' : 'Import'} ${plural(phase.plan.toAdd.length, 'sighting', 'sightings')}`}
          </button>
          <button type="button" className="btn block" onClick={() => setPhase({ step: 'pick' })}>
            Choose a different file
          </button>
        </div>
      )}

      {phase.step === 'done' && (
        <div className="stack" role="status">
          <p>
            <strong>
              {phase.sample ? 'Added' : 'Imported'} {plural(phase.added, 'sighting', 'sightings')}: {plural(phase.dexSpecies, 'Starter Dex bird', 'Starter Dex birds')}, {plural(phase.otherSpecies, 'other', 'others')}.
            </strong>
          </p>
          <p className="muted small">{phase.sample ? 'Your BirdDex now includes a made-up history, marked Sample. ' : 'Your BirdDex now shows the Starter Dex birds in colour.'}{phase.demoSwitchedOff ? ' The demo collection has been switched off so your real sightings show.' : ''}</p>
          <button type="button" className="btn primary block" onClick={onClose}>
            Done
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
