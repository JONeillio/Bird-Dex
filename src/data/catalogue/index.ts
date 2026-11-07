import raw from './starter-dex.v1.json'
import { StarterDexSchema, type DexSpecies } from '../schema'

/** The fixed, versioned Starter Dex. Parsed once; a bad catalogue fails loudly at start-up and in tests. */
const parsed = StarterDexSchema.parse(raw)

export const DEX_VERSION = parsed.version
export const STARTER_DEX: readonly DexSpecies[] = parsed.species
export const DEX_SIZE = STARTER_DEX.length

const byId = new Map(STARTER_DEX.map((s) => [s.id, s]))
export function dexById(id: string): DexSpecies | undefined {
  return byId.get(id)
}
