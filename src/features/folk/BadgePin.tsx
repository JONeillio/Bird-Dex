import type { WardenTier } from '../../domain/badges'

const LABEL: Record<WardenTier, string> = { none: 'Not yet earned', bronze: 'Bronze', silver: 'Silver', gold: 'Gold' }

/** A pin drawn in code (round, coloured by tier) until the badge art lands. */
export function BadgePin({ tier, glyph = '★', size = 44 }: { tier: WardenTier; glyph?: string; size?: number }) {
  return (
    <span className={`badge-pin tier-${tier}`} style={{ width: size, height: size, fontSize: size * 0.45 }} role="img" aria-label={LABEL[tier]}>
      {tier === 'none' ? '' : glyph}
    </span>
  )
}
