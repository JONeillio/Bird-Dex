// Short buzzes. Android Chrome supports these; iPhone Safari does not, so everything here is optional.
export const BUZZ = { tap: [8], select: [14], catch: [30, 40, 30, 40, 90], oops: [60, 50, 60] } as const

export function buzz(pattern: readonly number[], enabled: boolean): void {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate([...pattern])
  } catch {
    /* some browsers throw outside a user gesture: ignore */
  }
}
