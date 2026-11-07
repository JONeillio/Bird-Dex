import { DEMO_RECORDED_IDS } from '../data/demo'
import type { Prefs } from '../state/store'

/**
 * Which species count as recorded. Until M2 (logging and import) there are no real records,
 * so this is the demo collection when switched on, otherwise nothing. Public reports never add to it.
 */
export function recordedIds(prefs: Pick<Prefs, 'demoCollection'>): ReadonlySet<string> {
  return prefs.demoCollection ? new Set(DEMO_RECORDED_IDS) : new Set()
}
