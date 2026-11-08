import { useMemo, useState } from 'react'
import { wardenById } from '../../data/game'
import { personaById } from '../../data/personas'
import { callPoints, lifeNamesOf, makeCall, MAX_CALLS_PER_SIDE, reportKey, type CallResult } from '../../domain/callIt'
import { buildRarity, rarityOf } from '../../domain/rarity'
import { useGame } from '../../state/game'
import { Banner, Panel } from '../../ui/components'
import { BackButton } from '../shell/SettingsButton'
import { BadgePin } from './BadgePin'
import { useFolk, type CallView } from './useFolk'
import { wardenBadge } from '../../domain/badges'

/** The time the call is made (read when you tap, not while drawing the screen). */
const clockNow = (): Date => new Date()

const WHY: Record<string, string> = {
  none: 'Pick at least one bird.',
  'too-many': 'Five birds at most.',
  repeat: 'Each bird once.',
  'unknown-bird': 'That bird is not on the list.',
}

/** You versus a warden: name up to five birds you will log at their site; the higher points on your next visit win. */
export default function CallItScreen({ id }: { id: string }) {
  const f = useFolk()
  const put = useGame((s) => s.put)
  const w = wardenById(id)
  const [picked, setPicked] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')

  const mine = useMemo(() => f.calls.filter((c) => c.call.wardenId === id), [f.calls, id])
  const open = mine.find((c) => c.settlement.result === 'pending')
  const last = mine.find((c) => c.settlement.result !== 'pending')

  const options = useMemo(() => {
    if (!f.region) return []
    const table = buildRarity(f.region)
    const m = new Map<string, { key: string; name: string; pts: number }>()
    for (const s of f.region.sites) for (const r of s.reports) {
      const key = reportKey(r)
      if (!m.has(key)) m.set(key, { key, name: r.name, pts: callPoints(rarityOf(table, r.sciName).tier) })
    }
    for (const [key, name] of lifeNamesOf(f.encounters)) if (!m.has(key)) m.set(key, { key, name, pts: 1 })
    const needle = q.trim().toLowerCase()
    return [...m.values()].filter((o) => !needle || o.name.toLowerCase().includes(needle)).sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name)).slice(0, 40)
  }, [f.region, f.encounters, q])

  if (!w) {
    return (
      <>
        <Banner title="Call it" left={<BackButton to="#/folk" />} />
        <main className="screen"><p className="muted center">That warden is not in the app.</p></main>
      </>
    )
  }
  const p = personaById(w.persona)
  const first = p?.name.split(' ')[0] ?? 'the warden'
  const met = f.visited.has(w.siteId)

  const submit = () => {
    if (!f.region) return
    const r = makeCall({ warden: w, site: f.siteOf(w), region: f.region, player: picked, lifeList: lifeNamesOf(f.encounters), now: clockNow() })
    if (!r.ok) return setErr(WHY[r.reason] ?? 'Could not make that call.')
    setErr('')
    setPicked([])
    void put(r.call)
  }
  const toggle = (k: string) => setPicked((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : cur.length < MAX_CALLS_PER_SIDE ? [...cur, k] : cur))

  return (
    <>
      <Banner title="Call it" left={<BackButton to={`#/folk/warden/${w.id}`} />} />
      <main className="screen stack">
        <p className="muted small">You against {first} at {w.siteName}. Points come from how rare each bird is; the bigger total on your next visit wins.</p>

        {open && <Versus view={open} you="You" them={first} />}
        {last && <Versus view={last} you="You" them={first} silver={wardenBadge(w, f.real, f.callWins).tier} />}

        {!open && (
          <Panel className="stack tight">
            <h3 className="h-display small-h">Your call ({picked.length}/{MAX_CALLS_PER_SIDE})</h3>
            {!met && <p className="muted small">You have not logged a visit here yet. You can still call; it is settled by your next visit within 7 days.</p>}
            <input className="search" type="search" placeholder="Search birds" aria-label="Search birds" value={q} onChange={(e) => setQ(e.target.value)} />
            <ul className="pick-list">
              {options.map((o) => (
                <li key={o.key}>
                  <button type="button" aria-pressed={picked.includes(o.key)} onClick={() => toggle(o.key)}>
                    <span>{o.name}</span>
                    <b>{o.pts} pt{o.pts === 1 ? '' : 's'}</b>
                  </button>
                </li>
              ))}
              {options.length === 0 && <li className="muted small">No birds match that.</li>}
            </ul>
            {err && <p role="alert" className="small">{err}</p>}
            <button type="button" className="btn primary block" disabled={picked.length === 0 || !f.region} onClick={submit}>Make the call</button>
            <p className="muted small">Settled by the first real visit to {w.siteName} in the next 7 days. Only sightings you log or import after calling count.</p>
          </Panel>
        )}
      </main>
    </>
  )
}

const HEAD: Record<CallResult, string> = { win: 'You win!', loss: 'Close, but not this time', draw: 'A draw', pending: 'Your call is open', expired: 'No visit in time' }

function Versus({ view, you, them, silver }: { view: CallView; you: string; them: string; silver?: string }) {
  const { call, settlement: s } = view
  const total = (picks: typeof call.player) => picks.reduce((n, p) => n + p.pts, 0)
  const done = s.result !== 'pending' && s.result !== 'expired'
  return (
    <Panel className="stack tight">
      <h3 className="h-display">{HEAD[s.result]}</h3>
      <div className="versus">
        <div><span className="muted small">{you}</span><br /><b className={s.result === 'win' ? 'win' : ''}>{done ? s.player : total(call.player)}</b></div>
        <span>vs</span>
        <div><span className="muted small">{them}</span><br /><b>{done ? s.warden : total(call.warden)}</b></div>
      </div>
      <p className="small"><strong>Your five:</strong> {call.player.map((p) => `${p.name} (${p.pts})`).join(', ')}</p>
      <p className="small"><strong>{them}'s five:</strong> {call.warden.length ? call.warden.map((p) => `${p.name} (${p.pts})`).join(', ') : 'none, nothing is reported at their site right now'}</p>
      {s.result === 'pending' && <p className="muted small">Settled by your first visit here up to {call.expiresOn}. Totals show what each side is worth if all five are logged.</p>}
      {s.result === 'expired' && <p className="muted small">You did not log a visit here before {call.expiresOn}, so this call is closed.</p>}
      {done && (
        <p className="small">
          Settled by your visit on {s.outingDate}. Birds that scored: {s.hits.length ? s.hits.map((h) => h.name).join(', ') : 'none'}.
        </p>
      )}
      {s.result === 'win' && (
        <div className="row">
          <BadgePin tier="gold" glyph="★" />
          <span className="small">
            {silver === 'gold' ? `Gold pin earned for ${them}'s site.` : `Win noted. Log every signature bird here for silver and this win turns it gold.`}
          </span>
        </div>
      )}
    </Panel>
  )
}
