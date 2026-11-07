import { portraitSource } from '../../art/portraits'
import { dexById } from '../../data/catalogue'

const cache = new Map<string, string>()

/** Full-colour picture for a Starter Dex species (real portrait or generated placeholder). */
export function birdSrc(speciesId: string): string | null {
  const hit = cache.get(speciesId)
  if (hit) return hit
  const s = dexById(speciesId)
  if (!s) return null
  const src = portraitSource(s, false).src
  cache.set(speciesId, src)
  return src
}
