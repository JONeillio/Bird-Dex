import { useMemo, useState } from 'react'
import { dexById } from '../../data/catalogue'
import { nameForKey } from '../../domain/findBird'
import { planDay, wantedBirds } from '../../domain/routePlan'
import { shortSiteName } from '../../domain/siteName'
import { useRegionStart } from '../../state/useRegionStart'
import { useRecorded } from '../../state/useRecorded'
import { useStore } from '../../state/store'
import { Banner, Chip, DemoStamp, Panel, Pill } from '../../ui/components'
import { BackButton } from '../shell/SettingsButton'

const BUDGETS = [
  { min: 180, label: '3 hours' },
  { min: 300, label: '5 hours' },
  { min: 480, label: 'Full day' },
]
const clock = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}`

/** Plan a day: a few stops that between them cover the most birds you are after, with the drive between them. */
export default function PlanScreen() {
  const d = useRegionStart()
  const recorded = useRecorded()
  const focus = useStore((s) => s.focusSpeciesId)
  const setFocus = useStore((s) => s.setFocusSpecies)
  const [budget, setBudget] = useState(300)
  const [stopMin, setStopMin] = useState(40)

  const region = d.status === 'ready' ? d.region : null
  const startId = d.status === 'ready' ? d.start.id : ''
  const plan = useMemo(
    () => (region ? planDay(region, { startId, recorded, wanted: focus ? [focus] : 'new', budgetMin: budget, stopMin, maxStops: 4 }) : null),
    [region, startId, recorded, focus, budget, stopMin],
  )
  const wantedCount = useMemo(() => (region ? wantedBirds(region, focus ? [focus] : 'new', recorded).size : 0), [region, focus, recorded])

  if (d.status !== 'ready' || !plan) {
    return (
      <>
        <Banner title="Plan a day" left={<BackButton to="#/" />} />
        <main className="screen"><p className="muted center">{d.status === 'error' ? d.message : 'Loading…'}</p></main>
      </>
    )
  }
  const nameOf = (k: string) => dexById(k)?.name ?? nameForKey(d.region, k) ?? k
  const focusName = focus ? nameOf(focus) : null
  const mapsUrl = (() => {
    if (plan.stops.length === 0) return null
    const pts = plan.stops.map((s) => `${s.site.point[1]},${s.site.point[0]}`) // stored [lng, lat]; Google wants lat,lng
    const dest = pts[pts.length - 1]
    const way = pts.slice(0, -1).join('|')
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}${way ? `&waypoints=${encodeURIComponent(way)}` : ''}&travelmode=driving`
  })()

  return (
    <>
      <Banner title="Plan a day" left={<BackButton to="#/" />} />
      <main className="screen stack">
        <div className="row spread">
          <p className="muted small">Driving from {d.start.label}, back to {d.start.label}.</p>
          {d.region.isDemo && <DemoStamp />}
        </div>
        <div className="chips" role="group" aria-label="How long have you got">
          {BUDGETS.map((b) => (
            <Chip key={b.min} active={budget === b.min} onClick={() => setBudget(b.min)}>{b.label}</Chip>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Time at each stop">
          {[30, 40, 60].map((m) => (
            <Chip key={m} active={stopMin === m} onClick={() => setStopMin(m)}>{m} min a stop</Chip>
          ))}
        </div>
        <p className="small">
          Looking for: {focusName ? <strong>{focusName}</strong> : <strong>{wantedCount} birds new to you</strong>}{' '}
          {focusName && <button type="button" className="linkish" onClick={() => setFocus(null)}>Switch to every new bird</button>}
        </p>

        {!d.region.between ? (
          <Panel><p className="muted">Route planning arrives with the next data update.</p></Panel>
        ) : plan.stops.length === 0 ? (
          <Panel className="stack tight">
            <h3 className="h-display small-h">No plan fits</h3>
            <p className="muted">Nothing you are after is reported at a place you can reach and get home from in that time. Try a longer day, or a different bird.</p>
          </Panel>
        ) : (
          <>
            <ol className="plan-list">
              {plan.stops.map((st, i) => (
                <li key={st.site.id} className="plan-stop">
                  <div className="plan-time"><b>{i === 0 ? 'Leave' : `Stop ${i + 1}`}</b><span>{clock(st.arriveMin)}</span></div>
                  <Panel className="stack tight">
                    <h3 className="h-display small-h">{shortSiteName(st.site.name)}</h3>
                    <p className="small muted">Arrive about {clock(st.arriveMin)} after setting off · {stopMin} min here</p>
                    <div className="chips">
                      {st.birds.slice(0, 8).map((k) => (
                        <Pill key={k} tone="good">{nameOf(k)}</Pill>
                      ))}
                      {st.birds.length > 8 && <Pill>+{st.birds.length - 8}</Pill>}
                    </div>
                    <button type="button" className="btn small" onClick={() => { useStore.getState().setFocusSpecies(null, st.site.id); window.location.hash = '#/' }}>
                      See on the map
                    </button>
                  </Panel>
                </li>
              ))}
            </ol>
            <Panel className="stack tight">
              <p>
                <strong>{plan.stops.length} {plan.stops.length === 1 ? 'stop' : 'stops'}</strong>, about {clock(plan.totalMin)} door to door including {plan.returnMin} min home.
              </p>
              <p className="muted small">
                Covers {wantedCount - plan.uncovered.length} of {wantedCount} {focusName ? 'bird' : 'new birds'}. The drive home is estimated from the last stop's drive time from {d.start.label}. This is a plan from recent reports, not a promise the birds will be there.
              </p>
              {mapsUrl && <a className="btn primary block" href={mapsUrl} target="_blank" rel="noopener">Open route in Google Maps ↗</a>}
            </Panel>
          </>
        )}
        <p className="muted small credit">Drive times: © openrouteservice by HeiGIT | Data from OpenStreetMap. Sightings: eBird (ebird.org).</p>
      </main>
    </>
  )
}
