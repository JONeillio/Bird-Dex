// Finding and measuring what a tour step points at. Kept apart from React so the maths can be tested.

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Elements a step points at: every `[data-tour=id]` (drawn as one box), or the first match of a CSS selector. */
export function findTargets(root: ParentNode, step: { target?: string; selector?: string }): Element[] {
  if (step.target) return [...root.querySelectorAll(`[data-tour="${step.target}"]`)]
  if (step.selector) {
    try {
      const el = root.querySelector(step.selector)
      return el ? [el] : []
    } catch {
      return []
    }
  }
  return []
}

/** One box around all the rects, clipped to the screen. Null when nothing visible is left. */
export function unionBox(rects: readonly { left: number; top: number; right: number; bottom: number; width: number; height: number }[], vw: number, vh: number): Box | null {
  const seen = rects.filter((r) => r.width > 0 && r.height > 0)
  if (!seen.length) return null
  const left = Math.max(0, Math.min(...seen.map((r) => r.left)))
  const top = Math.max(0, Math.min(...seen.map((r) => r.top)))
  const right = Math.min(vw, Math.max(...seen.map((r) => r.right)))
  const bottom = Math.min(vh, Math.max(...seen.map((r) => r.bottom)))
  if (right <= left || bottom <= top) return null
  return { x: Math.round(left), y: Math.round(top), w: Math.round(right - left), h: Math.round(bottom - top) }
}

export function spotlightRect(els: readonly Element[], vw: number, vh: number): Box | null {
  return unionBox(els.map((e) => e.getBoundingClientRect()), vw, vh)
}

/** Whether the app is already on `route` (the map answers to "", "#", "#/" and "#/map"). */
export function routeMatches(hash: string, route: string): boolean {
  const norm = (h: string) => {
    const s = h.replace(/^#\/?/, '').replace(/\/$/, '')
    return s === '' ? 'map' : s
  }
  return norm(hash) === norm(route)
}
