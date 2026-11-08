import { useEffect, useRef, useState } from 'react'
import { STAMPS, tierMarkFor } from '../../art/marks'
import { dexById } from '../../data/catalogue'
import type { GameDoc } from '../../data/personal/game-schema'
import type { FieldReport, ReportBird } from '../../domain/fieldReport'
import { formatDate } from '../../domain/journal'
import { RARITY_LABELS } from '../../domain/rarity'
import type { LevelBar } from '../../domain/levelUps'
import { useGame, useOpenedKeys } from '../../state/game'
import { Banner, Panel, Pill, SampleStamp } from '../../ui/components'
import { MarkImg } from '../../ui/MarkImg'
import { SheetFrame } from '../../ui/dialogue'
import { useReducedMotion } from '../../ui/dialogue'
import { BirdPortrait } from '../birddex/BirdPortrait'
import { BackButton } from '../shell/SettingsButton'
import { ParcelArt } from './ParcelArt'
import { useReportData } from './useReport'

type Step = 'parcel' | 'report' | 'levelled' | 'card'
const STEPS: { id: Step; label: string }[] = [
  { id: 'report', label: 'Report' },
  { id: 'levelled', label: 'Levelled up' },
  { id: 'card', label: 'Card' },
]

const isNoteDoc = (d: GameDoc | undefined): d is Extract<GameDoc, { text: string }> => !!d && d.id.startsWith('note:') && 'text' in d
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function BirdPic({ id, size }: { id: string; size: number }) {
  const s = dexById(id)
  return s ? <BirdPortrait species={s} size={size} /> : <span className="report-nopic" style={{ width: size, height: size }} aria-hidden="true" />
}

function Tier({ b }: { b: ReportBird }) {
  const m = tierMarkFor(b.tier)
  return m ? <MarkImg mark={m} scale={1} /> : null
}

function StampRow({ r }: { r: FieldReport }) {
  const lifers = r.birds.filter((b) => b.lifer).length
  const firsts = r.birds.filter((b) => b.firstOfYear && !b.lifer).length
  const ups = r.birds.filter((b) => b.rankUp).length
  const items = [
    lifers > 0 && { mark: STAMPS.lifer, text: plural(lifers, 'lifer') },
    firsts > 0 && { mark: STAMPS.firstOfYear, text: `${plural(firsts, 'first')} of the year` },
    ups > 0 && { mark: STAMPS.rankUp, text: plural(ups, 'rank-up') },
    r.siteBest.isNewBest && { mark: STAMPS.newBest, text: 'New best here' },
    r.firstVisit && { mark: STAMPS.explored, text: 'First visit' },
  ].filter((x): x is { mark: typeof STAMPS.lifer; text: string } => !!x)
  if (items.length === 0) return null
  return (
    <ul className="report-stamps" aria-label="Highlights">
      {items.map((i) => (
        <li key={i.text}>
          <MarkImg mark={i.mark} scale={2} decorative />
          <span>{i.text}</span>
        </li>
      ))}
    </ul>
  )
}

function ReportStep({ r }: { r: FieldReport }) {
  const best = r.birds.find((b) => b.key === r.bestBird) ?? r.birds[0]
  const p = r.points
  const rows: [string, number][] = [
    ['Rarity', p.rarity],
    ['Lifers', p.lifers],
    ['Firsts of the year', p.firstsOfYear],
    ['Bond with your birds', p.bond],
    ['Exploring somewhere new', p.explorer],
  ]
  return (
    <SheetFrame handle className="stack">
      <div>
        <p className="muted small">
          {r.cardNo > 0 ? `Outing No. ${r.cardNo} of ${r.date.slice(0, 4)}` : 'Sample outing'}
          {r.startTime ? ` · from ${r.startTime}` : ''}
          {r.durationMin ? ` · ${r.durationMin} min` : ''}
        </p>
        <h2 className="h-display">{r.place || 'Somewhere not named'}</h2>
        <p className="muted">{formatDate(r.date)}</p>
        {r.sample && (
          <p className="row gap">
            <SampleStamp>Sample history</SampleStamp>
            <span className="small muted">Shown for practice. Nothing here is earned.</span>
          </p>
        )}
      </div>
      <div className="report-hero">
        <div className="report-total">
          <span className="report-total-num">{p.total}</span>
          <span className="small muted">points · {plural(r.speciesCount, 'species', 'species')}</span>
        </div>
        {best && (
          <div className="report-best">
            <BirdPic id={best.key} size={72} />
            <span className="small muted">Best bird</span>
            <strong>{best.name}</strong>
          </div>
        )}
      </div>
      <StampRow r={r} />
      <table className="report-points">
        <tbody>
          {rows
            .filter(([, v]) => v > 0)
            .map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                <td>+{v}</td>
              </tr>
            ))}
        </tbody>
      </table>
      {r.par && (
        <p className="report-par">
          Reported here lately: <strong>{r.par.par}</strong>. You found <strong>{r.par.found}</strong>
          {r.par.extra.length > 0 && (
            <>
              , plus {plural(r.par.extra.length, 'bird')} nobody else logged{r.extraNames.length > 0 ? `: ${r.extraNames.join(', ')}` : ''}
            </>
          )}
          .
        </p>
      )}
      {r.siteBest.previous !== null && !r.siteBest.isNewBest && <p className="small muted">Your best here is {r.siteBest.previous} species.</p>}
      {r.mostCounted && (
        <p className="small">
          Most counted: <strong>{r.mostCounted.count}</strong> {r.mostCounted.name}
        </p>
      )}
      <ul className="report-birds">
        {r.birds.map((b) => (
          <li key={b.key}>
            <BirdPic id={b.key} size={44} />
            <span className="report-bird-name">
              <strong>{b.name}</strong>
              <span className="small muted">{RARITY_LABELS[b.tier]}</span>
            </span>
            <Tier b={b} />
            <span className="row gap">
              {b.lifer && <MarkImg mark={STAMPS.lifer} scale={1} />}
              {b.firstOfYear && !b.lifer && <MarkImg mark={STAMPS.firstOfYear} scale={1} />}
              {b.rankUp && <MarkImg mark={STAMPS.rankUp} scale={1} />}
            </span>
            <span className="report-pts">+{b.points}</span>
          </li>
        ))}
      </ul>
    </SheetFrame>
  )
}

function Bar({ b, name, animate }: { b: LevelBar; name: string; animate: boolean }) {
  const [on, setOn] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    const id = window.setTimeout(() => setOn(true), 120)
    return () => window.clearTimeout(id)
  }, [animate])
  const pct = (n: number) => `${Math.round(n * 100)}%`
  return (
    <li className="bond-row">
      <BirdPic id={b.key} size={48} />
      <div className="bond-main">
        <div className="row spread">
          <strong>{name}</strong>
          <span className="small muted">+{b.gained}</span>
        </div>
        <div className="bond-bar" role="img" aria-label={`${name}: ${b.rankAfter}, ${b.after} Bond${b.nextAt ? ` of ${b.nextAt} for the next rank` : ''}`}>
          <div className="bond-base" style={{ width: pct(b.from) }} />
          <div className="bond-gain" style={{ left: pct(b.from), width: on ? pct(Math.max(0, b.to - b.from)) : '0%' }} />
        </div>
        <p className="small muted">
          {b.rankedUp ? (
            <span className="row gap">
              <MarkImg mark={STAMPS.rankUp} scale={1} decorative />
              <strong>
                {b.rankBefore} → {b.rankAfter}
              </strong>
            </span>
          ) : b.firstEver ? (
            <>New in your Dex · {b.rankAfter}</>
          ) : (
            <>
              {b.rankAfter}
              {b.nextAt ? ` · ${b.nextAt - b.after} to go` : ' · the top rank'}
            </>
          )}
        </p>
      </div>
    </li>
  )
}

function LevelledStep({ r, bars }: { r: FieldReport; bars: LevelBar[] }) {
  const reduced = useReducedMotion()
  const names = new Map(r.birds.map((b) => [b.key, b.name]))
  return (
    <SheetFrame handle className="stack">
      <h2 className="h-display">What levelled up</h2>
      <p className="muted small">Each bird&apos;s Bond grows when you meet it again somewhere new, at a new time or in a new season.</p>
      {bars.length === 0 ? <p>No new Bond this time: these were repeat sightings at the same place.</p> : (
        <ul className="bond-list">
          {bars.map((b) => (
            <Bar key={b.key} b={b} name={names.get(b.key) ?? b.key} animate={!reduced} />
          ))}
        </ul>
      )}
      {r.nearlyLevelled.length > 0 && (
        <div className="stack tight">
          <h3 className="h-display">Close to levelling</h3>
          <ul className="report-nearly">
            {r.nearlyLevelled.map((n) => (
              <li key={n.key}>
                <BirdPic id={n.key} size={40} />
                <span>
                  <strong>{n.name}</strong> is {n.toNext} Bond from the next rank
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SheetFrame>
  )
}

function CardStep({ r, outingKey }: { r: FieldReport; outingKey: string }) {
  const doc = useGame((s) => s.docs[`note:${outingKey}`])
  const setNote = useGame((s) => s.setNote)
  const saved = isNoteDoc(doc) ? doc.text : ''
  const [text, setText] = useState(saved)
  const [done, setDone] = useState(false)
  const best = r.birds.find((b) => b.key === r.bestBird) ?? r.birds[0]
  const tier = best ? tierMarkFor(best.tier) : null
  return (
    <div className="stack">
      <article className="outing-card" aria-label="Outing card">
        <header className="outing-card-top">
          <span>{r.cardNo > 0 ? `No. ${r.cardNo}` : 'Sample'}</span>
          <span>{r.date.slice(0, 4)}</span>
        </header>
        <div className="outing-card-window">{best ? <BirdPic id={best.key} size={112} /> : null}</div>
        <div className="outing-card-body">
          <h2 className="h-display">{r.place || 'Somewhere not named'}</h2>
          <p className="small muted">{formatDate(r.date)}</p>
          <p className="row gap">
            <strong>{plural(r.speciesCount, 'species', 'species')}</strong>·<strong>{r.points.total} points</strong>
          </p>
          {best && (
            <p className="row gap small">
              {tier && <MarkImg mark={tier} scale={1} />}
              Best: {best.name}
            </p>
          )}
          <StampRow r={r} />
          {r.sample && <SampleStamp>Sample history</SampleStamp>}
        </div>
      </article>
      <Panel className="stack tight">
        <label htmlFor="outing-note">
          <strong>A note on this day</strong>
        </label>
        <textarea id="outing-note" className="note-box" rows={3} maxLength={500} value={text} placeholder="What do you want to remember?" onChange={(e) => { setText(e.target.value); setDone(false) }} />
        <div className="row gap">
          <button type="button" className="btn small" disabled={text.trim() === saved.trim()} onClick={() => void setNote(outingKey, text).then(() => setDone(true))}>
            Save note
          </button>
          {done && <span className="small muted" role="status">Saved</span>}
        </div>
      </Panel>
    </div>
  )
}

function ParcelStep({ onOpened, rare, place, date }: { onOpened: () => void; rare: boolean; place: string; date: string }) {
  const reduced = useReducedMotion()
  const [state, setState] = useState<'closed' | 'opening' | 'open'>('closed')
  const timer = useRef<number | null>(null)
  useEffect(() => () => void (timer.current !== null && window.clearTimeout(timer.current)), [])
  const open = () => {
    if (state !== 'closed') return
    if (reduced) return onOpened()
    setState('opening')
    timer.current = window.setTimeout(() => {
      setState('open')
      timer.current = window.setTimeout(onOpened, 650)
    }, 700)
  }
  return (
    <section className="parcel-step stack">
      <h2 className="h-display">A parcel for you</h2>
      <p className="muted">
        From {place || 'a day out'} on {formatDate(date)}.
      </p>
      <button type="button" className="parcel-btn" onClick={open} aria-label="Open the parcel">
        <ParcelArt state={state} rare={rare} />
      </button>
      <button type="button" className="btn primary" onClick={open} disabled={state !== 'closed'}>
        Open it
      </button>
    </section>
  )
}

/** The post-trip flow at #/report/<outing>: parcel → Field Report → what levelled up → outing card. */
export default function ReportFlow({ outingKey }: { outingKey: string }) {
  const data = useReportData(outingKey)
  const opened = useOpenedKeys()
  const markOpened = useGame((s) => s.markOpened)
  const gameReady = useGame((s) => s.status === 'ready')
  const [step, setStep] = useState<Step | null>(null)

  // Start on the parcel when it has not been opened yet, otherwise on the report.
  const initial: Step | null = data.status !== 'ready' || !gameReady ? null : opened.has(outingKey) ? 'report' : 'parcel'
  const current = step ?? initial
  const rare = data.status === 'ready' && data.report.birds.some((b) => b.tier === 'rare' || b.tier === 'scarce')

  const idx = STEPS.findIndex((s) => s.id === current)
  const go = (s: Step) => {
    setStep(s)
    window.scrollTo?.({ top: 0 })
  }
  const back = <BackButton to="#/journal" />

  if (data.status === 'loading' || (data.status === 'ready' && !current)) {
    return (
      <>
        <Banner title="Field Report" left={back} />
        <main className="screen"><p className="muted">Opening…</p></main>
      </>
    )
  }
  if (data.status === 'missing') {
    return (
      <>
        <Banner title="Field Report" left={back} />
        <main className="screen stack">
          <Panel className="stack">
            <p>That outing is not in your Journal any more.</p>
            <a className="btn" href="#/journal">Back to the Journal</a>
          </Panel>
        </main>
      </>
    )
  }
  const { report, bars } = data
  return (
    <>
      <Banner title="Field Report" left={back} />
      <main className="screen stack">
        {current === 'parcel' ? (
          <ParcelStep rare={rare} place={report.place} date={report.date} onOpened={() => { void markOpened([outingKey]); go('report') }} />
        ) : (
          <>
            <ol className="steps" aria-label="Steps">
              {STEPS.map((s, i) => (
                <li key={s.id} aria-current={s.id === current ? 'step' : undefined} className={i <= idx ? 'done' : ''}>
                  <button type="button" onClick={() => go(s.id)}>{s.label}</button>
                </li>
              ))}
            </ol>
            {current === 'report' && <ReportStep r={report} />}
            {current === 'levelled' && <LevelledStep r={report} bars={bars} />}
            {current === 'card' && <CardStep r={report} outingKey={outingKey} />}
            <div className="row spread">
              {idx > 0 ? <button type="button" className="btn" onClick={() => go(STEPS[idx - 1].id)}>Back</button> : <span />}
              {idx < STEPS.length - 1 ? (
                <button type="button" className="btn primary" onClick={() => go(STEPS[idx + 1].id)}>
                  {STEPS[idx + 1].label === 'Levelled up' ? 'What levelled up' : 'See the card'}
                </button>
              ) : (
                <a className="btn primary" href="#/journal">Done</a>
              )}
            </div>
            {report.sample && <Pill tone="demo">Sample history: nothing earned</Pill>}
          </>
        )}
      </main>
    </>
  )
}
