import { useEffect } from 'react'
import { dexById } from '../../data/catalogue'
import { play } from '../../audio/sfx'
import { buzz, BUZZ } from '../../phone/haptics'
import { useStore } from '../../state/store'
import { useUi } from '../../state/ui'
import { BirdPortrait } from '../birddex/BirdPortrait'
import { useRecorded } from '../../state/useRecorded'
import { DEX_SIZE } from '../../data/catalogue'

/** Full-screen "new bird recorded" moment. The portrait pops from grey silhouette to colour. */
export function Reveal() {
  const reveal = useUi((s) => s.reveal)
  const close = useUi((s) => s.closeReveal)
  const prefs = useStore((s) => s.prefs)
  const recorded = useRecorded()
  const id = reveal?.speciesId
  useEffect(() => {
    if (!id) return
    play(reveal?.firstTime === false ? 'tick' : 'catch', prefs.soundOn)
    buzz(reveal?.firstTime === false ? BUZZ.select : BUZZ.catch, prefs.hapticsOn)
    // Only on the moment it appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, close])
  const species = id ? dexById(id) : undefined
  if (!reveal || !species) return null
  const count = [...recorded].length
  if (!reveal.firstTime) {
    // A lighter moment for a known bird: a rank-up and/or the first sighting of the year.
    return (
      <div className="reveal reveal-light" role="dialog" aria-modal="true" aria-label={`${species.name} update`} onClick={close}>
        <div className="reveal-card">
          {reveal.rankUp && <p className="reveal-kicker">Rank up!</p>}
          {!reveal.rankUp && reveal.firstOfYear && <p className="reveal-kicker">First of {reveal.firstOfYear}!</p>}
          <div className="reveal-bird">
            <BirdPortrait species={species} size={128} />
          </div>
          <h2 className="h-display">{species.name}</h2>
          {reveal.rankUp && (
            <p>
              {species.name} is now <strong>{reveal.rankUp.to}</strong>.
            </p>
          )}
          {reveal.firstOfYear && reveal.rankUp && <p className="muted">Also your first of {reveal.firstOfYear}.</p>}
          {!reveal.rankUp && reveal.firstOfYear && <p className="muted">The first {species.name} you have recorded this year.</p>}
          <div className="row two">
            <button type="button" className="btn" onClick={close}>
              Nice
            </button>
            <a className="btn primary" href={`#/bird/${species.id}`} onClick={close}>
              View bird
            </a>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="reveal" role="dialog" aria-modal="true" aria-label={`${species.name} recorded`}>
      <div className="reveal-card">
        <p className="reveal-kicker">New bird recorded!</p>
        <div className="reveal-bird">
          <BirdPortrait species={species} size={176} />
        </div>
        <h2 className="h-display">{species.name}</h2>
        <p className="muted">
          BirdDex #{String(species.dexNo).padStart(3, '0')} · {count} of {DEX_SIZE} recorded
        </p>
        <div className="row two">
          <button type="button" className="btn" onClick={close}>
            Nice
          </button>
          <a className="btn primary" href={`#/bird/${species.id}`} onClick={close}>
            View bird
          </a>
        </div>
      </div>
    </div>
  )
}
