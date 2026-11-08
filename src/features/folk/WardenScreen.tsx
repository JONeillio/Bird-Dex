import { dexById } from '../../data/catalogue'
import { wardenById } from '../../data/game'
import { personaById } from '../../data/personas'
import { wardenBadge } from '../../domain/badges'
import { wardenNote, weekKey } from '../../domain/wardenNote'
import { jobsFor, jobStatus, trust } from '../../domain/wardenJobs'
import { Banner, Panel, Pill } from '../../ui/components'
import { BackButton } from '../shell/SettingsButton'
import { BadgePin } from './BadgePin'
import { WardenPortrait } from './WardenPortrait'
import { useFolk } from './useFolk'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** One warden: who they are, your trust with them, this month's jobs, this week's note and the signature birds. */
export default function WardenScreen({ id }: { id: string }) {
  const f = useFolk()
  const w = wardenById(id)
  if (!w) {
    return (
      <>
        <Banner title="Warden" left={<BackButton to="#/folk" />} />
        <main className="screen"><p className="muted center">That warden is not in the app.</p></main>
      </>
    )
  }
  const p = personaById(w.persona)
  const met = f.visited.has(w.siteId)
  const tr = trust(w, f.real, f.now)
  const month = `${f.now.getFullYear()}-${String(f.now.getMonth() + 1).padStart(2, '0')}`
  const jobs = jobsFor(w, month)
  const note = f.region ? wardenNote(w, f.siteOf(w), f.region, weekKey(f.now)) : null
  const badge = wardenBadge(w, f.real, f.callWins)
  const myCalls = f.calls.filter((c) => c.call.wardenId === w.id)

  return (
    <>
      <Banner title="Warden" left={<BackButton to="#/folk" />} />
      <main className="screen stack">
        <Panel className="folk-card">
          <WardenPortrait persona={w.persona} met={met} size={96} />
          <div>
            <h2 className="h-display">{met ? p?.name : 'A warden you have not met'}</h2>
            <p className="muted small">{w.siteName}</p>
            <p className="small">{met ? `"${p?.greeting}"` : 'Log a visit to this place to meet them.'}</p>
          </div>
        </Panel>

        {met && (
          <>
            <Panel className="stack tight">
              <div className="row spread">
                <h3 className="h-display small-h">Trust: {tr.level}</h3>
                <BadgePin tier={badge.tier} />
              </div>
              <p className="muted small">{tr.completed} {tr.completed === 1 ? 'job' : 'jobs'} done{tr.next ? `. ${tr.next.more} more to ${tr.next.level}.` : '. The top level.'}</p>
            </Panel>

            <Panel className="stack tight">
              <h3 className="h-display small-h">{MONTHS[f.now.getMonth()]} jobs</h3>
              {jobs.map((j) => {
                const st = jobStatus(w, j, f.real)
                return (
                  <div key={j.id} className="job-row">
                    <span>{st.done ? '✓ ' : ''}{j.text}</span>
                    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={st.target} aria-valuenow={Math.min(st.progress, st.target)} aria-label="Job progress">
                      <div style={{ width: `${Math.min(100, Math.round((st.progress / Math.max(1, st.target)) * 100))}%` }} />
                    </div>
                  </div>
                )
              })}
              <p className="muted small">Jobs count from your own logged or imported sightings here.</p>
            </Panel>

            {note && (
              <Panel className="stack tight">
                <h3 className="h-display small-h">This week's note</h3>
                <p>"{note.text}"</p>
                <p className="muted small">Basis: {note.basis}</p>
              </Panel>
            )}
          </>
        )}

        <Panel className="stack tight">
          <h3 className="h-display small-h">Signature birds</h3>
          <p className="muted small">{badge.logged.length} of {badge.total} logged here{badge.bossLogged ? '' : ', including the boss still to find'}. Bronze needs {badge.needed} with the boss; silver needs them all.</p>
          <div className="chips">
            {w.signature.map((b) => (
              <Pill key={b} tone={badge.logged.includes(b) ? 'good' : undefined}>
                {b === w.boss ? '★ ' : ''}{dexById(b)?.name ?? b}
              </Pill>
            ))}
          </div>
        </Panel>

        <Panel className="stack tight">
          <h3 className="h-display small-h">Call it</h3>
          <p className="small">Name up to five birds you will log here. {p?.name.split(' ')[0] ?? 'They'} makes their own five. Whoever's birds are worth more on your next visit wins.</p>
          {myCalls.length > 0 && <p className="muted small">{myCalls.length} past {myCalls.length === 1 ? 'call' : 'calls'}.</p>}
          <a className="btn primary block" href={`#/folk/callit/${w.id}`}>{myCalls.some((c) => c.settlement.result === 'pending') ? 'See your open call' : 'Make a call'}</a>
        </Panel>
      </main>
    </>
  )
}
