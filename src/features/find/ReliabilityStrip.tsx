import { daysReported, reliabilityLabel, strip, WINDOW_DAYS } from '../../domain/reliability'

/** 14 small cells, oldest first, filled where the bird was reported at the place that day. Says nothing until history exists. */
export function ReliabilityStrip({ days, windowDays = WINDOW_DAYS }: { days: number | null | undefined; windowDays?: number }) {
  if (days === null || days === undefined) return <span className="muted small">History is still filling in</span>
  const n = daysReported(days)
  const cells = strip(days, windowDays)
  const label = n === null ? null : reliabilityLabel(n, windowDays)
  return (
    <span className="strip-wrap">
      <span className="rel-strip" role="img" aria-label={`Reported on ${n} of the last ${windowDays} days`}>
        {cells.map((on, i) => (
          <i key={i} className={on ? 'on' : ''} />
        ))}
      </span>
      <span className="muted small">{n} of {windowDays} days{label ? ` · ${label}` : ''}</span>
    </span>
  )
}
