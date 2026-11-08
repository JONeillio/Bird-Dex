// Curated game data for Field Bond, Wardens and Duels: bird traits and the duel condition cards.
// Parsed once at start-up; invalid data fails loudly (same pattern as the Starter Dex), and tests catch it first.
import { z } from 'zod'
import cardsRaw from './catalogue/duel-cards.v1.json'
import traitsRaw from './catalogue/traits.v1.json'
import { STARTER_DEX } from './catalogue'
import { SETS } from './schema'

export const SIZES = ['tiny', 'small', 'medium', 'large', 'huge'] as const
export const DIETS = ['seeds', 'insects', 'inverts', 'fish', 'plants', 'prey', 'omnivore'] as const
export const STATUSES = ['resident', 'winter', 'summer'] as const
export const ACTIVITIES = ['diurnal', 'crepuscular', 'nocturnal'] as const
export const BANDS = ['dawn', 'day', 'dusk', 'night'] as const

const TraitsSchema = z.strictObject({
  size: z.enum(SIZES),
  diet: z.enum(DIETS),
  status: z.enum(STATUSES),
  active: z.enum(ACTIVITIES),
  songster: z.boolean(),
})
export type Traits = z.infer<typeof TraitsSchema>
/** The trait names a duel card rule may test. */
export const TRAIT_KEYS = Object.keys(TraitsSchema.shape) as (keyof Traits)[]

const TraitsFileSchema = z.object({
  schema: z.literal(1),
  version: z.string(),
  traits: z.record(z.string(), TraitsSchema),
})

/** One condition a bird can satisfy. A rule tests one trait: a list of accepted values, or true/false for songster. */
const RuleSchema = z.union([
  z.strictObject({ size: z.array(z.enum(SIZES)).min(1) }),
  z.strictObject({ diet: z.array(z.enum(DIETS)).min(1) }),
  z.strictObject({ status: z.array(z.enum(STATUSES)).min(1) }),
  z.strictObject({ active: z.array(z.enum(ACTIVITIES)).min(1) }),
  z.strictObject({ songster: z.boolean() }),
])
export type Rule = z.infer<typeof RuleSchema>

const CardSchema = z.strictObject({
  id: z.string().regex(/^[a-z]+(-[a-z]+)*$/),
  name: z.string().min(1).max(40),
  flavour: z.string().min(1).max(120),
  /** Habitat sets the card favours; empty means every bird gets the habitat point. */
  sets: z.array(z.enum(SETS)),
  /** Months 1-12 the card can be drawn in, or null for all year. */
  months: z.array(z.number().int().min(1).max(12)).min(1).nullable(),
  /** Time band the card belongs to, or null for any time. */
  band: z.enum(BANDS).nullable(),
  rules: z.array(RuleSchema).max(2),
  /** `heard` cards count heard-only sightings as home ground; `context` cards match site, month and time. */
  affinity: z.enum(['context', 'heard']),
})
export type DuelCard = z.infer<typeof CardSchema>

const CardsFileSchema = z.object({
  schema: z.literal(1),
  version: z.string(),
  cards: z.array(CardSchema).min(5),
})

const traitsParsed = TraitsFileSchema.parse(traitsRaw)
const cardsParsed = CardsFileSchema.parse(cardsRaw)

// Traits must cover exactly the Starter Dex, so a duel never meets a bird it knows nothing about.
{
  const dexIds = new Set(STARTER_DEX.map((s) => s.id))
  const have = new Set(Object.keys(traitsParsed.traits))
  const missing = [...dexIds].filter((id) => !have.has(id))
  const extra = [...have].filter((id) => !dexIds.has(id))
  if (missing.length || extra.length) throw new Error(`traits.v1.json does not match the Starter Dex. Missing: ${missing.join(', ') || 'none'}. Unknown: ${extra.join(', ') || 'none'}.`)
  const ids = cardsParsed.cards.map((c) => c.id)
  if (new Set(ids).size !== ids.length) throw new Error('duel-cards.v1.json has a repeated card id.')
}

export const TRAITS_VERSION = traitsParsed.version
export const CARDS_VERSION = cardsParsed.version
export const DUEL_CARDS: readonly DuelCard[] = cardsParsed.cards

/** Traits for a Starter Dex bird, or undefined for anything else (outside-Dex birds have none). */
export function traitsById(id: string): Traits | undefined {
  return traitsParsed.traits[id]
}

const cardById = new Map(DUEL_CARDS.map((c) => [c.id, c]))
export function cardForId(id: string): DuelCard | undefined {
  return cardById.get(id)
}

/** The trait a rule tests. */
export function ruleKey(rule: Rule): keyof Traits {
  return Object.keys(rule)[0] as keyof Traits
}
