import { RANKS } from '../../domain/bond'

/** Rank emblem drawn in code until rank art lands: 1-5 small squares, the last one gold. */
export function RankPips({ rankIndex }: { rankIndex: number }) {
  return (
    <span className="rank-pips" role="img" aria-label={`${RANKS[rankIndex]}, rank ${rankIndex + 1} of 5`}>
      {RANKS.map((r, i) => (
        <i key={r} className={i <= rankIndex ? (rankIndex === 4 ? 'on gold' : 'on') : ''} />
      ))}
    </span>
  )
}
