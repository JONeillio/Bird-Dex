// Shared zod schemas. The app and the pipeline both import from here (one source of truth).
import { z } from 'zod'

export const SETS = ['garden', 'woodland', 'wetland', 'coast', 'raptors', 'farmland-upland'] as const
export type SetId = (typeof SETS)[number]
export const SET_LABELS: Record<SetId, string> = {
  garden: 'Garden',
  woodland: 'Woodland',
  wetland: 'Wetland',
  coast: 'Coast',
  raptors: 'Raptors',
  'farmland-upland': 'Farmland',
}

export const TEMPLATES = [
  'songbird', 'tit', 'thrush', 'finch', 'duck', 'swan', 'heron', 'raptor', 'woodpecker', 'kingfisher', 'gull', 'pigeon',
] as const
export type TemplateId = (typeof TEMPLATES)[number]

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'colour must be #rrggbb')

export const BirdPaletteSchema = z.object({
  back: hex.optional(),
  wing: hex.optional(),
  cap: hex.optional(),
  cheek: hex.optional(),
  neck: hex.optional(),
  breast: hex.optional(),
  belly: hex.optional(),
  bill: hex.optional(),
  legs: hex.optional(),
  tail: hex.optional(),
})
export type BirdPalette = z.infer<typeof BirdPaletteSchema>

export const TweakSchema = z.object({
  scale: z.number().min(0.4).max(1.4).optional(),
  bill: z.number().min(-4).max(12).optional(),
  legs: z.number().min(-8).max(8).optional(),
  tail: z.number().min(-6).max(12).optional(),
  tailAng: z.number().min(-60).max(80).optional(),
  head: z.number().min(-2).max(3).optional(),
  neck: z.number().min(-3).max(3).optional(),
  crest: z.number().min(0).max(4).optional(),
})
export type Tweak = z.infer<typeof TweakSchema>

export const DexSpeciesSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  dexNo: z.number().int().positive(),
  name: z.string().min(2),
  ebirdName: z.string().min(2),
  sciName: z.string().regex(/^[A-Z][a-z]+ [a-z]+$/, 'two-part scientific name'),
  family: z.string().min(2),
  sets: z.array(z.enum(SETS)).min(1),
  habitat: z.enum(SETS),
  art: z.object({ template: z.enum(TEMPLATES), palette: BirdPaletteSchema, tweak: TweakSchema.optional() }),
  portraitAssetId: z.string(),
})
export type DexSpecies = z.infer<typeof DexSpeciesSchema>

export const StarterDexSchema = z
  .object({ schema: z.literal(1), version: z.string(), species: z.array(DexSpeciesSchema).min(1) })
  .superRefine((d, ctx) => {
    const ids = new Set<string>()
    const sci = new Set<string>()
    d.species.forEach((s, i) => {
      if (ids.has(s.id)) ctx.addIssue({ code: 'custom', message: `duplicate id ${s.id}` })
      if (sci.has(s.sciName)) ctx.addIssue({ code: 'custom', message: `duplicate sciName ${s.sciName}` })
      ids.add(s.id)
      sci.add(s.sciName)
      if (s.dexNo !== i + 1) ctx.addIssue({ code: 'custom', message: `dexNo ${s.dexNo} should be ${i + 1}` })
      if (!s.sets.includes(s.habitat)) ctx.addIssue({ code: 'custom', message: `${s.id}: habitat not in sets` })
    })
  })
export type StarterDex = z.infer<typeof StarterDexSchema>
