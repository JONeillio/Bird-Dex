// Published JSON contracts (BUILD_PLAN.md D1). The pipeline writes these, the app reads them.
// All points are [lng, lat]. Nothing here may carry observer names or raw eBird payloads.
import { z } from 'zod'

const lng = z.number().min(-180).max(180)
const lat = z.number().min(-90).max(90)
export const PointSchema = z.tuple([lng, lat])
export type LngLat = z.infer<typeof PointSchema>

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const StartPointSchema = z.object({ id: z.string(), label: z.string(), point: PointSchema })

export const RegionRefSchema = z.object({
  id: z.string(),
  label: z.string(),
  centre: PointSchema,
  zoom: z.number(),
  startPoints: z.array(StartPointSchema).min(1),
  file: z.string(),
})

export const IndexSchema = z.object({
  schema: z.literal(1),
  generatedAt: z.string(),
  isDemo: z.boolean(),
  regions: z.array(RegionRefSchema).min(1),
})
export type PublishedIndex = z.infer<typeof IndexSchema>
export type RegionRef = z.infer<typeof RegionRefSchema>

export const ReportSchema = z.object({
  speciesId: z.string().nullable(),
  ebirdCode: z.string(),
  name: z.string(),
  sciName: z.string(),
  obsDate: isoDate,
  obsTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  count: z.number().int().nullable(),
  checklistUrl: z.string().url().nullable(),
  reviewed: z.boolean(),
  /** eBird flagged it as rare for the area and date (from the notable-observations feed). */
  notable: z.boolean().optional(),
  /** A notable record eBird's reviewers have not yet accepted. Shown as "unconfirmed", never hidden. */
  unconfirmed: z.boolean().optional(),
  /**
   * Which recent days this bird was reported here, as a bitmask over the region window: bit 0 is the day the data
   * was generated, bit 1 the day before, up to bit 13. Counted from the pipeline's own history (P1), so it fills up
   * over the first two weeks; read it as "about N of 14 days". Missing in older data.
   */
  days: z.number().int().min(0).max(16383).optional(),
  /** How many of the remembered report times fell in each part of the day. Only reports with a time count. */
  bands: z.object({ dawn: z.number().int().min(0), day: z.number().int().min(0), dusk: z.number().int().min(0), night: z.number().int().min(0) }).optional(),
})
export type Report = z.infer<typeof ReportSchema>

export const SiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  point: PointSchema,
  url: z.string().url().nullable(),
  latestObsDate: isoDate.nullable(),
  speciesAllTime: z.number().int().nullable(),
  access: z.enum(['public', 'unknown']),
  reports: z.array(ReportSchema),
})
export type Site = z.infer<typeof SiteSchema>

export const DriveEntrySchema = z.union([
  z.object({ status: z.literal('ok'), s: z.number().nonnegative(), m: z.number().nonnegative() }),
  z.object({ status: z.literal('unknown') }),
])
export type DriveEntry = z.infer<typeof DriveEntrySchema>

/** Seconds between the busiest sites (one matrix request per region), for the day planner. null = unknown, never 0. */
export const BetweenSchema = z.object({
  ids: z.array(z.string()),
  s: z.array(z.array(z.number().int().nonnegative().nullable())),
})
export type Between = z.infer<typeof BetweenSchema>

export const RegionSchema = z.object({
  schema: z.literal(1),
  regionId: z.string(),
  generatedAt: z.string(),
  isDemo: z.boolean(),
  windowDays: z.number().int().positive(),
  coverage: z.object({
    hotspotsListed: z.number().int(),
    hotspotsActive: z.number().int(),
    reportsFetchedFor: z.number().int(),
    truncated: z.boolean(),
    note: z.string(),
  }),
  sites: z.array(SiteSchema),
  drive: z.object({
    computedAt: z.string().nullable(),
    byStart: z.record(z.string(), z.record(z.string(), DriveEntrySchema)),
  }),
  unmatchedSpecies: z.array(z.object({ sciName: z.string(), name: z.string(), sites: z.number().int() })),
  /** Optional: older published data does not have it, and the planner then says route planning is coming. */
  between: BetweenSchema.optional(),
  /** First day the pipeline began remembering reports (P1). The app says "since 9 Nov" while `days` fills up. */
  historySince: isoDate.optional(),
}).superRefine((r, ctx) => {
  const b = r.between
  if (!b) return
  const known = new Set(r.sites.map((s) => s.id))
  const n = b.ids.length
  if (new Set(b.ids).size !== n) ctx.addIssue({ code: 'custom', path: ['between', 'ids'], message: 'between ids must be unique' })
  if (b.ids.some((id) => !known.has(id))) ctx.addIssue({ code: 'custom', path: ['between', 'ids'], message: 'between ids must all be sites in the region' })
  if (b.s.length !== n || b.s.some((row) => row.length !== n)) ctx.addIssue({ code: 'custom', path: ['between', 's'], message: 'between matrix must be square and match ids' })
})
export type RegionData = z.infer<typeof RegionSchema>
