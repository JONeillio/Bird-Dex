// Screen-space marker clustering, pure and tested. Markers are grouped by how much they would overlap on
// the screen right now, so dense areas collapse into "5 spots" and sparse areas stay as single sites.
// Positions are in CSS pixels (map.project), so the result adapts to zoom and to the size of the phone.

export interface ClusterItem {
  id: string
  /** Centre of the marker on screen. */
  x: number
  y: number
  /** Footprint, when it differs from an ordinary pin (the selected marker is bigger). */
  w?: number
  h?: number
}

export interface Cluster {
  /** Member ids, in the order the items were given (the caller passes them best-first). */
  ids: string[]
  /** Mean screen position of the members. */
  x: number
  y: number
}

export interface ClusterOpts {
  /** Footprint of one ordinary marker (30x40 sprite plus a little air). */
  itemW: number
  itemH: number
  /** Footprint of a "5 spots" marker, which is wider than a single pin. */
  pillW: number
  pillH: number
}

export const DEFAULT_CLUSTER_OPTS: ClusterOpts = { itemW: 32, itemH: 40, pillW: 92, pillH: 40 }

interface Work {
  ids: number[]
  x: number
  y: number
  w: number
  h: number
}

/**
 * Merge items whose markers would overlap. Starts with every item alone and repeatedly merges the most
 * overlapped pair until nothing overlaps, so a chain of markers collapses into one group and a merged
 * group that drifts into a neighbour is merged again. Deterministic for a given input order.
 */
export function clusterByOverlap(items: readonly ClusterItem[], opts: ClusterOpts = DEFAULT_CLUSTER_OPTS): Cluster[] {
  let groups: Work[] = items.map((it, i) => ({ ids: [i], x: it.x, y: it.y, w: it.w ?? opts.itemW, h: it.h ?? opts.itemH }))

  // How close a pair is, as a fraction of the distance at which their boxes just touch: < 1 means overlap.
  const closeness = (a: Work, b: Work): number =>
    Math.max(Math.abs(a.x - b.x) / ((a.w + b.w) / 2), Math.abs(a.y - b.y) / ((a.h + b.h) / 2))

  for (;;) {
    let best = 1
    let bi = -1
    let bj = -1
    for (let i = 0; i < groups.length; i++)
      for (let j = i + 1; j < groups.length; j++) {
        const c = closeness(groups[i], groups[j])
        if (c < best) {
          best = c
          bi = i
          bj = j
        }
      }
    if (bi < 0) break
    const a = groups[bi]
    const b = groups[bj]
    const n = a.ids.length + b.ids.length
    const merged: Work = {
      ids: [...a.ids, ...b.ids].sort((p, q) => p - q),
      x: (a.x * a.ids.length + b.x * b.ids.length) / n,
      y: (a.y * a.ids.length + b.y * b.ids.length) / n,
      // A group is drawn as the wider "N spots" marker, unless it holds a bigger one (the selected site).
      w: Math.max(opts.pillW, a.w, b.w),
      h: Math.max(opts.pillH, a.h, b.h),
    }
    groups = groups.filter((_, k) => k !== bi && k !== bj)
    groups.push(merged)
  }

  return groups
    .map((g) => ({ ids: g.ids.map((i) => items[i].id), x: g.x, y: g.y, first: g.ids[0] }))
    .sort((p, q) => p.first - q.first)
    .map(({ ids, x, y }) => ({ ids, x, y }))
}
