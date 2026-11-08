import { STARTER_DEX } from '../../data/catalogue'
import { Banner } from '../../ui/components'
import { BackButton } from '../shell/SettingsButton'
import { BirdPortrait } from '../birddex/BirdPortrait'
import { portraitSource } from '../../art/portraits'
import { PERSONAS, SCENE_ART, wardenArt } from '../../art/wardens'

/** #/dev/art: every bird in colour and silhouette, so art can be checked on a phone. */
export default function DevArt() {
  return (
    <>
      <Banner title="Dev: art" left={<BackButton to="#/settings" />} />
      <main className="screen stack">
        <p className="muted">
          {STARTER_DEX.length} birds. Real draft portraits are marked with a star; everything else is a generated placeholder.
        </p>
        <h3 className="h-display">Reserve Wardens</h3>
        <p className="muted">{PERSONAS.filter((p) => wardenArt(p.id)).length} of {PERSONAS.length} have art. The rest wait for the next art set.</p>
        <div className="art-grid">
          {PERSONAS.map((p) => {
            const a = wardenArt(p.id)
            return (
              <div key={p.id} className="art-cell">
                {a ? <img src={a.src} width={96} height={96} alt={p.name} className="warden-img" /> : <div className="warden-missing" aria-hidden="true" />}
                <span className="art-name">{a ? '★ ' : ''}{p.name}</span>
              </div>
            )
          })}
        </div>
        <h3 className="h-display">Scenes</h3>
        <div className="art-grid">
          {Object.values(SCENE_ART).map((sc) => (
            <div key={sc.src} className="art-cell">
              <img src={sc.src} width={sc.size * 2} height={sc.size * 2} alt={sc.label} className="warden-img" />
              <span className="art-name">{sc.label}</span>
            </div>
          ))}
        </div>
        <h3 className="h-display">Birds</h3>
        <div className="art-grid">
          {STARTER_DEX.map((s) => (
            <div key={s.id} className="art-cell">
              <div className="art-pair">
                <BirdPortrait species={s} size={64} />
                <BirdPortrait species={s} silhouette size={64} />
              </div>
              <span className="art-name">{!portraitSource(s, false).isPlaceholder ? '★ ' : ''}{s.name}</span>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
