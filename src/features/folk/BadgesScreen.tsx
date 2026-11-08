import { personaById } from '../../data/personas'
import { SET_LABELS } from '../../data/schema'
import { earnedBadges } from '../../domain/badges'
import { useStore } from '../../state/store'
import { Banner, Panel } from '../../ui/components'
import { BackButton } from '../shell/SettingsButton'
import { BadgePin } from './BadgePin'
import { useFolk } from './useFolk'

/** Everything you have earned from your own sightings: warden pins, set badges and year-list badges. */
export default function BadgesScreen() {
  const f = useFolk()
  const demo = useStore((s) => s.prefs.demoCollection)
  const r = earnedBadges({ encounters: f.encounters, wardens: f.wardens, callWins: f.callWins, year: f.now.getFullYear(), demoCollection: demo })
  const hasSample = f.encounters.some((e) => e.source === 'sample')
  return (
    <>
      <Banner title="Badge case" left={<BackButton to="#/folk" />} />
      <main className="screen stack">
        <p className="muted small">Earned only from sightings you log or import. Public reports, the demo collection and sample history never earn anything.</p>
        {(demo || hasSample) && <p className="small">{demo ? 'Demo collection is on, so nothing is earned right now.' : 'Sample history is ignored here.'}</p>}

        <Panel className="stack tight">
          <h3 className="h-display small-h">Reserve pins</h3>
          <div className="badge-grid">
            {r.wardens.map((b) => {
              const w = f.wardens.find((x) => x.id === b.wardenId)
              return (
                <a key={b.wardenId} className="badge-cell" href={`#/folk/warden/${b.wardenId}`}>
                  <BadgePin tier={b.tier} size={52} />
                  <span>{w ? (personaById(w.persona)?.name.split(' ')[0] ?? w.persona) : b.wardenId}</span>
                  <span className="muted small">{b.logged.length}/{b.total}</span>
                </a>
              )
            })}
          </div>
          <p className="muted small">Bronze: the boss plus five signature birds at the site. Silver: all of them. Gold: silver plus a Call it win.</p>
        </Panel>

        <Panel className="stack tight">
          <h3 className="h-display small-h">Habitat sets</h3>
          <div className="badge-grid">
            {r.sets.map((s) => (
              <div key={s.set} className="badge-cell">
                <BadgePin tier={s.earned ? 'gold' : 'none'} size={52} glyph="✓" />
                <span>{SET_LABELS[s.set]}</span>
                <span className="muted small">{s.have}/{s.total}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="stack tight">
          <h3 className="h-display small-h">{r.year.year} year list: {r.year.species} species</h3>
          <div className="badge-grid">
            {r.year.badges.map((b) => (
              <div key={b.threshold} className="badge-cell">
                <BadgePin tier={b.earned ? 'silver' : 'none'} size={52} glyph={String(b.threshold)} />
                <span>{b.threshold} birds</span>
              </div>
            ))}
          </div>
        </Panel>
      </main>
    </>
  )
}
