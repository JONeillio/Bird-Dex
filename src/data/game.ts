// Curated game data for Field Bond, Wardens and Duels: bird traits and the duel condition cards.
// Parsed once at start-up; invalid data fails loudly (same pattern as the Starter Dex), and tests catch it first.
import { z } from 'zod'
import cardsRaw from './catalogue/duel-cards.v1.json'
import traitsRaw from './catalogue/traits.v1.json'
import { STARTER_DEX } from './catalogue'
import { SETS } from './schema'
import wardensRaw from './wardens.v1.json'
import { PERSONAS, type WardenHabitat } from './personas'
import jobsRaw from './warden-jobs.v1.json'

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

// Reserve Wardens: real sites with a signature list of Dex birds each (AUTOPILOT D2). Drafted by pipeline/warden-draft.ts
// from live data, then checked by a person. Site ids are eBird hotspot ids and are matched against encounters' siteId.
const HABITATS = ['wetland', 'coast', 'woodland', 'farmland-upland', 'garden', 'raptors', 'night'] as const

const WardenSchema = z.strictObject({
  /** `<persona>-<regionId>`. Used in badge keys, duel routes and saved duel wins. */
  id: z.string().regex(/^[a-z]+-[a-z0-9]+(-[a-z0-9]+)*$/),
  persona: z.string(),
  siteId: z.string().min(1),
  siteName: z.string().min(1),
  habitat: z.enum(HABITATS),
  signature: z.array(z.string()).min(3).max(8),
  boss: z.string(),
})
export type Warden = z.infer<typeof WardenSchema>

const WardensFileSchema = z.object({
  schema: z.literal(1),
  version: z.string(),
  locations: z.record(z.string(), z.array(WardenSchema).min(1)),
})

const wardensParsed = WardensFileSchema.parse(wardensRaw)
{
  const personaIds = new Set(PERSONAS.map((p) => p.id))
  const dexIds = new Set(STARTER_DEX.map((s) => s.id))
  const seen = new Set<string>()
  for (const [region, list] of Object.entries(wardensParsed.locations)) {
    const personas = new Set<string>()
    const sites = new Set<string>()
    for (const w of list) {
      const where = `wardens.v1.json ${region}/${w.id}`
      if (w.id !== `${w.persona}-${region}`) throw new Error(`${where}: id must be persona-region.`)
      if (seen.has(w.id)) throw new Error(`${where}: repeated warden id.`)
      seen.add(w.id)
      if (!personaIds.has(w.persona)) throw new Error(`${where}: unknown persona ${w.persona}.`)
      if (personas.has(w.persona)) throw new Error(`${where}: persona used twice in one location.`)
      personas.add(w.persona)
      if (sites.has(w.siteId)) throw new Error(`${where}: two wardens at one site.`)
      sites.add(w.siteId)
      for (const id of w.signature) if (!dexIds.has(id)) throw new Error(`${where}: ${id} is not in the Starter Dex.`)
      if (new Set(w.signature).size !== w.signature.length) throw new Error(`${where}: repeated signature bird.`)
      if (!w.signature.includes(w.boss)) throw new Error(`${where}: the boss must be in the signature list.`)
    }
  }
}

export const WARDENS_VERSION = wardensParsed.version

/** The wardens for a region (empty for a region with none, e.g. the demo). */
export function wardensFor(regionId: string): readonly Warden[] {
  return wardensParsed.locations[regionId] ?? []
}
export function allWardens(): readonly Warden[] {
  return Object.values(wardensParsed.locations).flat()
}
export const wardenById = (id: string): Warden | undefined => allWardens().find((w) => w.id === id)

// Warden jobs: small monthly tasks at a warden's own site (AUTOPILOT P9). Templates per habitat; the engine fills them in.
export const JOB_KINDS = ['count', 'heard', 'band', 'signature', 'season'] as const
export type JobKind = (typeof JOB_KINDS)[number]

const JobTemplateSchema = z.strictObject({
  id: z.string().regex(/^[a-z]+(-[a-z]+)*$/),
  kind: z.enum(JOB_KINDS),
  /** Plain English with {bird}, {min} and {n} slots. */
  text: z.string().min(8).max(120),
  /** count: the least number counted in one sighting. */
  min: z.number().int().min(2).max(100).optional(),
  /** band and signature: how many different birds. */
  n: z.number().int().min(1).max(6).optional(),
  /** band: the part of the day. heard: optional. */
  band: z.enum(['dawn', 'day', 'dusk', 'night']).optional(),
})
export type JobTemplate = z.infer<typeof JobTemplateSchema>

const JobsFileSchema = z.object({
  schema: z.literal(1),
  version: z.string(),
  templates: z.record(z.enum(HABITATS), z.array(JobTemplateSchema).min(3)),
})

const jobsParsed = JobsFileSchema.parse(jobsRaw)
{
  const seen = new Set<string>()
  for (const h of HABITATS) {
    const list = jobsParsed.templates[h]
    if (!list) throw new Error(`warden-jobs.v1.json has no templates for ${h}.`)
    if (new Set(list.map((t) => t.kind)).size < 3) throw new Error(`warden-jobs.v1.json ${h}: needs at least three different kinds.`)
    for (const t of list) {
      const where = `warden-jobs.v1.json ${h}/${t.id}`
      if (seen.has(t.id)) throw new Error(`${where}: repeated template id.`)
      seen.add(t.id)
      const has = (slot: string) => t.text.includes(`{${slot}}`)
      if ((t.kind === 'count' || t.kind === 'heard') !== has('bird')) throw new Error(`${where}: {bird} belongs in count and heard jobs only.`)
      if (t.kind === 'count' && (t.min === undefined || !has('min'))) throw new Error(`${where}: a count job needs min and {min}.`)
      if ((t.kind === 'band' || t.kind === 'signature') && (t.n === undefined || !has('n'))) throw new Error(`${where}: needs n and {n}.`)
      if (t.kind === 'band' && !t.band) throw new Error(`${where}: a band job needs a band.`)
      if (t.kind === 'season' && (t.min !== undefined || t.n !== undefined || t.band)) throw new Error(`${where}: a season job takes no numbers.`)
    }
  }
}

export const WARDEN_JOBS_VERSION = jobsParsed.version
export function jobTemplatesFor(habitat: WardenHabitat): readonly JobTemplate[] {
  return jobsParsed.templates[habitat] ?? []
}
