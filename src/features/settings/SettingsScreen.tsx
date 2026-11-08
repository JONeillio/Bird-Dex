import { useRef, useState } from 'react'
import { STARTER_DEX } from '../../data/catalogue'
import { buildBackup, parseBackup, planRestore, type MergePlan } from '../../domain/backup'
import { needsMotionPermission, requestMotionPermission, tiltSupported } from '../../phone/tilt'
import { useInstall } from '../../phone/install'
import { play, unlockAudio } from '../../audio/sfx'
import { buzz, BUZZ } from '../../phone/haptics'
import { useRecords } from '../../state/records'
import { useStore, type Prefs } from '../../state/store'
import { useUi } from '../../state/ui'
import { Banner, Chip, Panel } from '../../ui/components'
import { BackButton } from '../shell/SettingsButton'

const KNOWN = new Set(STARTER_DEX.map((s) => s.id))

function Toggle({ pref, on, off, note }: { pref: keyof Prefs; on: string; off: string; note?: string }) {
  const value = useStore((s) => s.prefs[pref]) as boolean
  const setPref = useStore((s) => s.setPref)
  return (
    <div className="stack tight">
      <Chip active={value} onClick={() => setPref(pref, !value as never)}>
        {value ? on : off}
      </Chip>
      {note && <p className="muted small">{note}</p>}
    </div>
  )
}

export default function SettingsScreen() {
  const prefs = useStore((s) => s.prefs)
  const setPref = useStore((s) => s.setPref)
  const targets = prefs.targets
  const encounters = useRecords((s) => s.encounters)
  const replaceAll = useRecords((s) => s.replaceAll)
  const say = useUi((s) => s.say)
  const install = useInstall()
  const fileRef = useRef<HTMLInputElement>(null)
  const [plan, setPlan] = useState<{ plan: MergePlan; targets: string[] } | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  const download = () => {
    const backup = buildBackup(encounters, targets)
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `birdquest-backup-${backup.exportedAt.slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    setPref('lastBackupAt', backup.exportedAt)
    say('Backup downloaded. Keep the file somewhere safe.')
  }

  const onFile = async (file: File | undefined) => {
    setRestoreError(null)
    setPlan(null)
    if (!file) return
    if (file.size > 30_000_000) {
      setRestoreError('That file is too big to be a BirdQuest backup.')
      return
    }
    const r = parseBackup(await file.text())
    if (!r.ok) {
      setRestoreError(r.error)
      return
    }
    setPlan({ plan: planRestore(encounters, targets, r.backup, KNOWN), targets: r.backup.targets })
  }

  const confirmRestore = async () => {
    if (!plan) return
    await replaceAll(plan.plan.merged)
    for (const t of plan.plan.addedTargets) useStore.getState().toggleTarget(t)
    say(`Restored ${plan.plan.added} sighting${plan.plan.added === 1 ? '' : 's'}.`)
    setPlan(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const turnOnTilt = async () => {
    if (!prefs.tiltOn && needsMotionPermission() && !(await requestMotionPermission())) {
      say('Motion access was not allowed, so tilt stays off.')
      return
    }
    setPref('tiltOn', !prefs.tiltOn)
  }

  return (
    <>
      <Banner title="Settings" left={<BackButton to="#/map" />} />
      <main className="screen stack">
        <Panel className="stack">
          <h2 className="h-display small-h">Sound and feel</h2>
          <div className="stack tight">
            <Chip
              active={prefs.soundOn}
              onClick={() => {
                const next = !prefs.soundOn
                setPref('soundOn', next)
                if (next) {
                  unlockAudio()
                  play('start', true)
                }
              }}
            >
              {prefs.soundOn ? '8-bit sounds on' : '8-bit sounds off'}
            </Chip>
            <p className="muted small">Little chiptune blips when you open the app, change tabs and record a bird. Off until you turn it on.</p>
          </div>
          <div className="stack tight">
            <Chip
              active={prefs.hapticsOn}
              onClick={() => {
                setPref('hapticsOn', !prefs.hapticsOn)
                if (!prefs.hapticsOn) buzz(BUZZ.catch, true)
              }}
            >
              {prefs.hapticsOn ? 'Vibration on' : 'Vibration off'}
            </Chip>
            <p className="muted small">A short buzz when you catch a bird. Works on Android; iPhones ignore it.</p>
          </div>
          <div className="stack tight">
            <Chip active={prefs.tiltOn} onClick={() => void turnOnTilt()}>
              {prefs.tiltOn ? 'Tilt effects on' : 'Tilt effects off'}
            </Chip>
            <p className="muted small">
              Bird scenes shift and recorded birds shimmer as you tilt the phone.{tiltSupported() ? '' : ' This device has no motion sensor.'} Ignored if your phone is set to reduce motion.
            </p>
          </div>
          <Toggle pref="keepAwake" on="Keep screen on" off="Screen can sleep" note="Stops the screen switching off while the app is open. Uses more battery." />
        </Panel>

        <Panel className="stack">
          <h2 className="h-display small-h">Backup</h2>
          <p className="muted">
            {encounters.length} {encounters.length === 1 ? 'sighting' : 'sightings'} saved on this phone.
            {prefs.lastBackupAt ? ` Last backup ${new Date(prefs.lastBackupAt).toLocaleDateString('en-GB')}.` : ' No backup yet.'}
          </p>
          <button type="button" className="btn primary" onClick={download}>
            Download backup
          </button>
          <label className="btn photo-btn">
            Restore from a backup file
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
          {restoreError && (
            <p className="form-error" role="alert">
              {restoreError}
            </p>
          )}
          {plan && (
            <div className="stack tight">
              <p>
                <strong>{plan.plan.added}</strong> new sighting{plan.plan.added === 1 ? '' : 's'} to add
                {plan.plan.duplicates > 0 ? `, ${plan.plan.duplicates} already here` : ''}
                {plan.plan.unknown > 0 ? `, ${plan.plan.unknown} for birds not in this Starter Dex (skipped)` : ''}
                {plan.plan.addedTargets.length > 0 ? `, ${plan.plan.addedTargets.length} target${plan.plan.addedTargets.length === 1 ? '' : 's'}` : ''}. Nothing on this phone is removed.
              </p>
              <div className="row two">
                <button type="button" className="btn" onClick={() => setPlan(null)}>
                  Cancel
                </button>
                <button type="button" className="btn primary" onClick={() => void confirmRestore()} disabled={plan.plan.added === 0 && plan.plan.addedTargets.length === 0}>
                  Add them
                </button>
              </div>
            </div>
          )}
        </Panel>

        <Panel className="stack">
          <h2 className="h-display small-h">Install on your phone</h2>
          {install.installed ? (
            <p className="muted">BirdQuest is installed. It opens like an app and the screens work without signal; the map and fresh sightings need a connection.</p>
          ) : install.canPrompt ? (
            <>
              <p className="muted">Add BirdQuest to your home screen so it opens full screen like an app.</p>
              <button type="button" className="btn primary" onClick={() => void install.prompt()}>
                Install BirdQuest
              </button>
            </>
          ) : install.ios ? (
            <p className="muted">On iPhone: tap the Share button in Safari, then “Add to Home Screen”.</p>
          ) : (
            <p className="muted">In Chrome, open the ⋮ menu and choose “Install app” or “Add to Home screen”.</p>
          )}
        </Panel>

        <Panel className="stack">
          <h2 className="h-display small-h">Demo collection</h2>
          <p className="muted">Fills your BirdDex with 24 labelled demo birds so you can see how it looks. It never counts as real progress.</p>
          <div className="row">
            <Chip active={prefs.demoCollection} onClick={() => setPref('demoCollection', !prefs.demoCollection)}>
              {prefs.demoCollection ? 'Demo collection on' : 'Demo collection off'}
            </Chip>
          </div>
        </Panel>

        <Panel className="stack">
          <h2 className="h-display small-h">About</h2>
          <p>
            BirdQuest is a personal, non-commercial project. Sightings come from eBird (ebird.org), drive times from openrouteservice by HeiGIT, and map data from OpenStreetMap contributors via OpenFreeMap.
          </p>
          <p className="muted">
            Your sightings stay on this phone. Your location, if you use the bird radar, is only used on the phone to point an arrow and is never saved or sent. <a href="#/dev/ui">UI kit</a> · <a href="#/dev/art">Bird art</a> · <a href="#/dev/engine">Engine</a>
          </p>
        </Panel>
      </main>
    </>
  )
}
