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
})
export type RegionData = z.infer<typeof RegionSchema>
