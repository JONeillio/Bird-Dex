import { dexById } from '../../data/catalogue'
import { daysAgo, type SiteView } from '../../domain/ranking'
import { DemoStamp } from '../../ui/components'
import { birdSrc } from './birdArt'

/** Today's Quest: the best site within the drive limit, with one lure bird shown large (BUILD_PLAN B1). */
export function QuestCard({ views, index, onIndex, onView, limit, onWiden, isDemo, startLabel }: {
  views: SiteView[]
  index: number
  onIndex: (i: number) => void
  onView: (siteId: string) => void
  limit: number
  onWiden: (() => void) | null
  isDemo: boolean
  startLabel: string
}) {
  if (views.length === 0)
    return (
      <div className="quest panel">
        <div className="quest-text">
          <strong>Nothing new within {limit} min this fortnight.</strong>
          {onWiden && (
            <button type="button" className="btn small" onClick={onWiden}>
              Try 90 min
            </button>
          )}
        </div>
      </div>
    )
  const i = Math.min(index, views.length - 1)
  const v = views[i]
  const lure = v.lure?.speciesId ? dexById(v.lure.speciesId) : undefined
  const src = lure ? birdSrc(lure.id) : null
  const n = v.newIds.length
  return (
    <div className="quest panel">
      {src && <img className="quest-bird" src={src} width={64} height={64} alt={lure?.name ?? ''} />}
      <div className="quest-text">
        <div className="quest-top">
          <span className="quest-kicker">{n ? `Find ${n === 1 ? 'a new bird' : `${n} new birds`}` : 'Birds reported'}</span>
          {isDemo && <DemoStamp />}
        </div>
        <strong className="quest-title">{lure ? `${lure.name} at ${v.site.name}` : v.site.name}</strong>
        <span className="muted small">
          {v.minutes} min from {startLabel}
          {v.newest ? ` · last report ${daysAgo(v.newest)}` : ''}
        </span>
        <div className="quest-actions">
          <button type="button" className="btn primary small" onClick={() => onView(v.site.id)}>
            View spot ▶
          </button>
          {views.length > 1 && (
            <button type="button" className="btn small ghost" onClick={() => onIndex((i + 1) % views.length)} aria-label="Next suggestion">
              {i + 1} of {views.length} ›
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
