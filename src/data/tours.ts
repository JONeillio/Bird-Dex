// Guided tours with Dot (9 Nov 2026). The script lives in tours.v1.json so wording can change without touching code.
// Plan and the tours still to write: TUTORIAL_PLAN.md.
import { z } from 'zod'
import { DOT_POSES } from '../art/dot'
import data from './tours.v1.json'

export const EXHIBITS = ['pin-site', 'pin-target', 'stamp-unexplored', 'stamp-explored', 'stamp-lifer', 'tier-rare', 'tier-scarce', 'tier-common'] as const

const LineSchema = z.object({
  pose: z.enum(DOT_POSES),
  text: z.string().min(1).max(160),
  /** Used when a {token} in `text` has no live value (no data yet, demo, an empty Dex). */
  fallback: z.string().min(1).max(160).optional(),
  skin: z.enum(['paper', 'lifer']).optional(),
  mirror: z.boolean().optional(),
  /** An icon Dot holds up beside the bubble while she explains it. */
  exhibit: z.enum(EXHIBITS).optional(),
})

const ChoiceSchema = z.object({
  /** next: carry on · later: close for now, ask again next visit · never / finish: close and don't start again by itself. */
  id: z.enum(['next', 'later', 'never', 'finish']),
  label: z.string().min(1).max(32),
})

const StepSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    /** Hash to go to before the step shows. */
    route: z.string().regex(/^#\//).optional(),
    /** A `data-tour` id in the app to spotlight (every element with that id, as one box). */
    target: z.string().regex(/^[a-z0-9-]+$/).optional(),
    /** Or a CSS selector, for things drawn by libraries (map markers) or repeated (cards). First match only. */
    selector: z.string().optional(),
    /** tap: tap Dot to carry on (default) · target: tap the spotlit thing to carry on (Next still works). */
    advance: z.enum(['tap', 'target']).default('tap'),
    /** Short instruction shown under the bubble on `target` steps. */
    hint: z.string().max(40).optional(),
    /** Where the bubble sits. auto: away from the spotlight. */
    dock: z.enum(['auto', 'top', 'bottom']).default('auto'),
    lines: z.array(LineSchema).min(1),
    /** Buttons after the last line instead of Next. */
    choices: z.array(ChoiceSchema).min(1).max(3).optional(),
  })
  .refine((s) => !(s.target && s.selector), 'a step has a target or a selector, not both')
  .refine((s) => s.advance !== 'target' || !!(s.target || s.selector), 'a target step needs something to tap')

const TourSchema = z.object({
  title: z.string(),
  /** Starts by itself on first open until finished or dismissed. */
  auto: z.boolean().default(false),
  steps: z.array(StepSchema).min(1),
})

const ToursSchema = z.object({
  schema: z.literal(1),
  version: z.string(),
  tours: z.record(z.string().regex(/^[a-z0-9-]+$/), TourSchema),
})

export type TourLine = z.infer<typeof LineSchema>
export type TourStep = z.infer<typeof StepSchema>
export type Tour = z.infer<typeof TourSchema>
export type Exhibit = (typeof EXHIBITS)[number]

export const TOURS = ToursSchema.parse(data).tours

export function tourById(id: string): Tour | undefined {
  return TOURS[id]
}
