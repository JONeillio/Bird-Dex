import { STARTER_DEX } from '../../data/catalogue'
import { Banner } from '../../ui/components'
import { BackButton } from '../shell/SettingsButton'
import { BirdPortrait } from '../birddex/BirdPortrait'
import { portraitSource } from '../../art/portraits'

/** #/dev/art: every bird in colour and silhouette, so art can be checked on a phone. */
export default function DevArt() {
  return (
    <>
      <Banner title="Dev: art" left={<BackButton to="#/settings" />} />
      <main className="screen stack">
        <p className="muted">
          {STARTER_DEX.length} birds. Real draft portraits are marked with a star; everything else is a generated placeholder.
        </p>
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
