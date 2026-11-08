import type { Mark } from '../art/marks'

/** A stamp or rarity mark at a whole-number scale (pixel art stays sharp). */
export function MarkImg({ mark, scale = 2, decorative = false }: { mark: Mark; scale?: number; decorative?: boolean }) {
  return <img className="mark-img" src={mark.src} width={mark.w * scale} height={mark.h * scale} alt={decorative ? '' : mark.label} aria-hidden={decorative || undefined} draggable={false} />
}
