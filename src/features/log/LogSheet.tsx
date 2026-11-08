import { useMemo, useState } from 'react'
import { STARTER_DEX, dexById } from '../../data/catalogue'
import { EncounterSchema, MODES, MODE_LABELS, validSiteId, type Encounter, type Mode } from '../../data/personal-schema'
import { todayIso } from '../../domain/collection'
import { outsideId } from '../../domain/taxon'
import { nowHHMM } from '../../domain/time'
import { play } from '../../audio/sfx'
import { buzz, BUZZ } from '../../phone/haptics'
import { shrinkPhoto } from '../../phone/photo'
import { computeBond, rankUps } from '../../domain/bond'
import { isFirstOfYear } from '../../domain/dexLists'
import { newEncounterId, useRecords } from '../../state/records'
import { useStore } from '../../state/store'
import { useUi, type LogRequest } from '../../state/ui'
import { BottomSheet, Segmented } from '../../ui/components'

const SORTED = [...STARTER_DEX].sort((a, b) => a.name.localeCompare(b.name))

/** The "Log a sighting" sheet. Opens from anywhere via useUi().openLog(). */
export function LogSheet() {
  const req = useUi((s) => s.logRequest)
  if (!req) return null
  return <LogForm key={`${req.edit?.id ?? ''}|${req.speciesId ?? ''}|${req.outside?.sciName ?? ''}|${req.siteId ?? ''}|${req.place ?? ''}`} req={req} />
}

function LogForm({ req }: { req: LogRequest }) {
  const edit = req.edit
  const outside = edit && edit.speciesId.startsWith('x-') ? { name: edit.name ?? edit.speciesId, sciName: edit.sciName ?? '' } : req.outside
  const speciesId = edit?.speciesId ?? req.speciesId
  const placeIn = edit ? edit.place : req.place
  // Only real eBird site ids are kept; demo sites never become a saved site.
  const siteIn = validSiteId(edit ? edit.siteId : req.siteId)
  const close = useUi((s) => s.closeLog)
  const showReveal = useUi((s) => s.showReveal)
  const say = useUi((s) => s.say)
  const encounters = useRecords((s) => s.encounters)
  const add = useRecords((s) => s.add)
  const update = useRecords((s) => s.update)
  const prefs = useStore((s) => s.prefs)
  const setPref = useStore((s) => s.setPref)

  const [species, setSpecies] = useState(speciesId ?? '')
  const [date, setDate] = useState(edit ? edit.date ?? '' : todayIso())
  // A new sighting made today starts with the time now (editable). An edit keeps whatever was saved.
  const [time, setTime] = useState(edit ? edit.time ?? '' : nowHHMM())
  const [timeTouched, setTimeTouched] = useState(false)
  const [place, setPlace] = useState(placeIn ?? '')
  const [mode, setMode] = useState<Mode>(edit?.mode ?? 'seen')
  const [notes, setNotes] = useState(edit?.notes ?? '')
  const [photo, setPhoto] = useState<string | null>(edit?.photo ?? null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const places = useMemo(() => [...new Set(encounters.map((e) => e.place).filter(Boolean))].slice(-12), [encounters])
  const today = todayIso()

  const onDate = (d: string) => {
    setDate(d)
    // The automatic time only makes sense for today; a time you typed yourself stays.
    if (!edit && !timeTouched) setTime(d === today ? nowHHMM() : '')
  }

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
    if (!outside && (!species || !dexById(species))) {
      setError('Choose which bird you saw.')
      return
    }
    if (date && date > today) {
      setError('That date is in the future.')
      return
    }
    const placeTrim = place.trim()
    // If the place text was changed, the eBird site it was prefilled from no longer applies.
    const siteId = placeTrim === (placeIn ?? '').trim() ? siteIn : null
    const speciesKey = outside ? (edit ? edit.speciesId : outsideId(outside.sciName)) : species
    const base: Encounter = edit ?? {
      id: newEncounterId(),
      speciesId: speciesKey,
      date: null,
      place: '',
      mode: 'seen',
      notes: '',
      photo: null,
      createdAt: new Date().toISOString(),
      source: 'log',
      ...(outside ? { name: outside.name, sciName: outside.sciName } : {}),
    }
    const parsed = EncounterSchema.safeParse({
      ...base,
      speciesId: speciesKey,
      date: date || null,
      time: time || null,
      siteId,
      place: placeTrim,
      mode,
      notes: notes.trim(),
      photo,
    })
    if (!parsed.success) {
      setError('Something in that entry is too long or not valid. Shorten the notes or place and try again.')
      play('oops', prefs.soundOn)
      return
    }
    if (edit) {
      await update(parsed.data)
      close()
      play('tick', prefs.soundOn)
      say('Sighting updated.')
      return
    }
    const firstTime = !encounters.some((e) => e.speciesId === speciesKey)
    await add(parsed.data)
    // Demo mode hides real records, so switch it off to let the new sighting show up.
    const wasDemo = prefs.demoCollection
    if (wasDemo) setPref('demoCollection', false)
    close()
    if (outside) {
      play('tick', prefs.soundOn)
      buzz(BUZZ.select, prefs.hapticsOn)
      say(`Logged ${outside.name}. It is not in the Starter Dex, so it will show in your life list.${wasDemo ? ' Demo collection switched off.' : ''}`)
      return
    }
    const ups = rankUps(computeBond(encounters), computeBond([...encounters, parsed.data])).find((u) => u.speciesId === speciesKey)
    const foy = parsed.data.date && isFirstOfYear(encounters, speciesKey, parsed.data.date) ? Number(parsed.data.date.slice(0, 4)) : undefined
    if (firstTime) showReveal({ speciesId: species, firstTime: true })
    else if (ups || foy) {
      showReveal({ speciesId: species, firstTime: false, rankUp: ups ? { from: ups.from, to: ups.to } : undefined, firstOfYear: foy })
    } else {
      play('tick', prefs.soundOn)
      buzz(BUZZ.select, prefs.hapticsOn)
      say(`Added another ${dexById(species)?.name ?? 'bird'} sighting.${wasDemo ? ' Demo collection switched off.' : ''}`)
    }
    if (firstTime && wasDemo) say('Demo collection switched off so your real sightings show.')
  }

  return (
    <BottomSheet open onClose={close} title={edit ? 'Edit sighting' : 'Log a sighting'}>
      <h2 className="h-display site-name">{edit ? 'Edit sighting' : 'Log a sighting'}</h2>
      <p className="muted small">Saved on this phone only. Your own sightings are what fill your BirdDex.</p>
      <div className="form stack">
        {outside ? (
          <div className="field">
            <span>Which bird?</span>
            <strong>{outside.name}</strong>
            <span className="muted small">Not in the Starter Dex, so it counts in your life list rather than filling a card.</span>
          </div>
        ) : (
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
        )}
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} max={today} onChange={(e) => onDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Time (optional)</span>
          <input
            type="time"
            value={time}
            onChange={(e) => {
              setTimeTouched(true)
              setTime(e.target.value)
            }}
          />
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
          {edit ? 'Save changes' : 'Save sighting'}
        </button>
      </div>
    </BottomSheet>
  )
}
