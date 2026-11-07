import { useMemo } from 'react'
import { portraitSource } from '../../art/portraits'
import type { DexSpecies } from '../../data/schema'

/** One bird picture. `silhouette` gives the flat grey unrecorded look from the same art. */
export function BirdPortrait({ species, silhouette = false, size = 96, className = '' }: {
  species: DexSpecies
  silhouette?: boolean
  size?: number
  className?: string
}) {
  const p = useMemo(() => portraitSource(species, silhouette), [species, silhouette])
  return (
    <img
      className={`portrait ${p.silhouetteFilter ? 'portrait-sil' : ''} ${className}`.trim()}
      src={p.src}
      width={size}
      height={size}
      alt={silhouette ? `${species.name}, not yet recorded` : species.name}
      draggable={false}
    />
  )
}
