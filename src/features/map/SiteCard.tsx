import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { dexById } from '../../data/catalogue'
import { daysAgo, recentBirds, type SiteView } from '../../domain/ranking'
import { shortSiteName } from '../../domain/siteName'
import { DemoStamp } from '../../ui/components'
import { birdSrc } from './birdArt'

const STRIP_MAX = 6

/**
 * The card for the selected site. Collapsed (the default, so the map has room): short name, then how many species
 * are new to you, the featured bird and the drive, with View spot. Tap the card or its handle to open it up: the
 * full line and the strip of recently reported birds. It closes again when another site is picked. Full designation
 * and access notes live in the details sheet ("View spot").
 */
export function SiteCard({ view, position, total, onNext, onDetails, recorded, isDemo, onHeight, explored }: {
  view: SiteView | null
  position: number
  total: number
  onNext: () => void
  onDetails: () => void
  recorded: ReadonlySet<string>
  isDemo: boolean
  onHeight: (px: number) => void
  /** You have birded here (from your own logs or an eBird import). */
  explored?: boolean
}) {
  const box = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const siteId = view?.site.id
  // A different site starts collapsed again.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setOpen(false), [siteId])
  useEffect(() => {
    const el = box.current
    if (!el) return
    const report = () => onHeight(Math.ceil(el.getBoundingClientRect().height))
    report()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => ro.disconnect()
  }, [onHeight])

  if (!view)
    return (
      <div className="site-card panel" ref={box}>
        <strong className="card-name">Nothing to show here</strong>
        <span className="muted small">No sites match these filters. Try a longer drive time.</span>
      </div>
    )

  const n = view.newIds.length
  const birds = recentBirds(view.site, recorded)
  const lure = view.lure?.speciesId ? dexById(view.lure.speciesId) : undefined
  const when = view.lure ? daysAgo(view.lure.obsDate) : view.newest ? daysAgo(view.newest) : null
  const away = view.minutes !== null ? `${view.minutes} min away` : 'drive time unknown'
  const reported = lure && when ? `${lure.name} reported ${when}` : when ? `Birds reported ${when}` : 'No recent reports'
  const short = [lure && when ? `${lure.name}, ${when}` : when ? `reports ${when}` : null, view.minutes !== null ? `${view.minutes} min` : 'drive unknown']
    .filter(Boolean)
    .join(' · ')
  // Taps on the card body open or close it; buttons and links inside keep their own jobs.
  const onCardClick = (e: MouseEvent) => {
    if ((e.target as Element).closest('button, a')) return
    setOpen((o) => !o)
  }

  return (
    <div className={`site-card panel${open ? ' open' : ''}`} ref={box} data-tour="site-card" onClick={onCardClick}>
      <button type="button" className="card-handle" aria-expanded={open} aria-label={open ? 'Show less' : 'Show the birds reported here'} onClick={() => setOpen((o) => !o)} />
      {isDemo && (
        <span className="card-stamp">
          <DemoStamp />
        </span>
      )}
      <div className="card-head">
        <strong className="card-name">{shortSiteName(view.site.name)}</strong>
        {total > 1 && (
          <button type="button" className="btn small ghost card-next" onClick={onNext} aria-label={`Next site, ${position} of ${total}`}>
            {position} of {total} ›
          </button>
        )}
      </div>
      <div className="card-count-row">
        <span className="card-line">
          <b className="card-count">{n === 0 ? 'Nothing new' : `${n} new`}</b>
          <span className="muted"> · {short}</span>
        </span>
        <button type="button" className="btn primary small card-view" onClick={onDetails} data-tour="site-view">
          View spot ▶
        </button>
      </div>
      {open && (
        <>
          <span className="card-line muted">
            {reported} · {away}
            {explored === undefined ? '' : explored ? ' · Explored' : ' · Not visited yet'}
          </span>
          {birds.length > 0 && (
            <ul className="bird-strip" aria-label="Birds reported here recently">
              {birds.slice(0, STRIP_MAX).map((b) => {
                const s = dexById(b.speciesId)
                const src = birdSrc(b.speciesId)
                return (
                  <li key={b.speciesId}>
                    <a href={`#/bird/${b.speciesId}`} className={`strip-bird${b.isNew ? ' new' : ''}`} aria-label={`${s?.name ?? b.speciesId}, reported ${daysAgo(b.obsDate)}${b.isNew ? ', new to you' : ''}`}>
                      {src && <img src={src} width={32} height={32} alt="" draggable={false} />}
                    </a>
                  </li>
                )
              })}
              {birds.length > STRIP_MAX && <li className="strip-more">+{birds.length - STRIP_MAX}</li>}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
