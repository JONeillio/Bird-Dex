import { useMemo, useState } from 'react'
import { STARTER_DEX, dexById } from '../../data/catalogue'
import { EncounterSchema, MODES, MODE_LABELS, type Mode } from '../../data/personal-schema'
import { todayIso } from '../../domain/collection'
import { play } from '../../audio/sfx'
import { buzz, BUZZ } from '../../phone/haptics'
import { shrinkPhoto } from '../../phone/photo'
import { newEncounterId, useRecords } from '../../state/records'
import { useStore } from '../../state/store'
import { useUi } from '../../state/ui'
import { BottomSheet, Segmented } from '../../ui/components'

const SORTED = [...STARTER_DEX].sort((a, b) => a.name.localeCompare(b.name))

/** The "Log a sighting" sheet. Opens from anywhere via useUi().openLog(). */
export function LogSheet() {
  const req = useUi((s) => s.logRequest)
  if (!req) return null
  return <LogForm key={`${req.speciesId ?? ''}|${req.place ?? ''}`} speciesId={req.speciesId} place={req.place} />
}

function LogForm({ speciesId, place: placeIn }: { speciesId?: string; place?: string }) {
  const close = useUi((s) => s.closeLog)
  const showReveal = useUi((s) => s.showReveal)
  const say = useUi((s) => s.say)
  const encounters = useRecords((s) => s.encounters)
  const add = useRecords((s) => s.add)
  const prefs = useStore((s) => s.prefs)
  const setPref = useStore((s) => s.setPref)

  const [species, setSpecies] = useState(speciesId ?? '')
  const [date, setDate] = useState(todayIso())
  const [place, setPlace] = useState(placeIn ?? '')
  const [mode, setMode] = useState<Mode>('seen')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const places = useMemo(() => [...new Set(encounters.map((e) => e.place).filter(Boolean))].slice(-12), [encounters])
  const today = todayIso()

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      setPhoto(await shrinkPhoto(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not use that picture.')
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    setError(null)
    if (!species || !dexById(species)) {
      setError('Choose which bird you saw.')
      return
    }
    if (date && date > today) {
      setError('That date is in the future.')
      return
    }
    const parsed = EncounterSchema.safeParse({
      id: newEncounterId(),
      speciesId: species,
      date: date || null,
      place: place.trim(),
      mode,
      notes: notes.trim(),
      photo,
      createdAt: new Date().toISOString(),
    })
    if (!parsed.success) {
      setError('Something in that entry is too long or not valid. Shorten the notes or place and try again.')
      play('oops', prefs.soundOn)
      return
    }
    const firstTime = !encounters.some((e) => e.speciesId === species)
    await add(parsed.data)
    // Demo mode hides real records, so switch it off to let the new sighting show up.
    const wasDemo = prefs.demoCollection
    if (wasDemo) setPref('demoCollection', false)
    close()
    if (firstTime) showReveal({ speciesId: species, firstTime: true })
    else {
      play('tick', prefs.soundOn)
      buzz(BUZZ.select, prefs.hapticsOn)
      say(`Added another ${dexById(species)?.name ?? 'bird'} sighting.${wasDemo ? ' Demo collection switched off.' : ''}`)
    }
    if (firstTime && wasDemo) say('Demo collection switched off so your real sightings show.')
  }

  return (
    <BottomSheet open onClose={close} title="Log a sighting">
      <h2 className="h-display site-name">Log a sighting</h2>
      <p className="muted small">Saved on this phone only. Your own sightings are what fill your BirdDex.</p>
      <div className="form stack">
        <label className="field">
          <span>Which bird?</span>
          <select value={species} onChange={(e) => setSpecies(e.target.value)} aria-label="Which bird">
            <option value="">Choose a bird…</option>
            {SORTED.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Where? (optional)</span>
          <input type="text" value={place} maxLength={120} list="log-places" placeholder="e.g. Chorlton Water Park" onChange={(e) => setPlace(e.target.value)} />
          <datalist id="log-places">
            {places.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        <Segmented label="How did you record it?" value={mode} onChange={setMode} options={MODES.map((m) => ({ value: m, label: MODE_LABELS[m] }))} />
        <label className="field">
          <span>Notes (optional)</span>
          <textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Behaviour, weather, who was with you…" />
        </label>
        <div className="field">
          <span>Photo (optional)</span>
          {photo ? (
            <div className="photo-pick">
              <img src={photo} alt="Your photo" width={96} height={96} />
              <button type="button" className="btn small" onClick={() => setPhoto(null)}>
                Remove
              </button>
            </div>
          ) : (
            <label className="btn small photo-btn">
              {busy ? 'Reading picture…' : 'Take or choose a photo'}
              <input type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
            </label>
          )}
        </div>
        {prefs.demoCollection && <p className="muted small">The demo collection is on. Saving switches it off so your real sightings show.</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="btn primary block" onClick={() => void save()} disabled={busy}>
          Save sighting
        </button>
      </div>
    </BottomSheet>
  )
}
