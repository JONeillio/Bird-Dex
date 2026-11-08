/**
 * The parcel for a new outing, drawn in code until the real parcel art arrives (game art brief 2, Set 11).
 * 24x24 pixel grid, scaled by whole numbers. `state` drives a small open animation (instant with reduced motion).
 */
export function ParcelArt({ state, scale = 5, rare = false }: { state: 'closed' | 'opening' | 'open'; scale?: number; rare?: boolean }) {
  const string = rare ? '#d8a84b' : '#a9835a'
  const paper = '#c9a06a'
  const shade = '#a9835a'
  const ink = '#1a1411'
  return (
    <svg className={`parcel parcel-${state}`} width={24 * scale} height={24 * scale} viewBox="0 0 24 24" shapeRendering="crispEdges" role="img" aria-label={state === 'open' ? 'An open parcel' : 'A parcel tied with string'}>
      <g className="parcel-body">
        <rect x="3" y="9" width="18" height="13" fill={ink} />
        <rect x="4" y="10" width="16" height="11" fill={paper} />
        <rect x="4" y="18" width="16" height="3" fill={shade} />
        <rect x="11" y="10" width="2" height="11" fill={string} />
        <rect x="4" y="14" width="16" height="2" fill={string} />
        {state !== 'open' && (
          <>
            <rect x="15" y="16" width="5" height="5" fill={ink} />
            <rect x="16" y="17" width="3" height="3" fill="#fffbef" />
            <rect x="16" y="17" width="1" height="1" fill={ink} />
          </>
        )}
      </g>
      <g className="parcel-lid">
        <rect x="2" y="5" width="20" height="5" fill={ink} />
        <rect x="3" y="6" width="18" height="3" fill={paper} />
        <rect x="10" y="3" width="4" height="3" fill={string} />
        <rect x="9" y="2" width="2" height="2" fill={string} />
        <rect x="13" y="2" width="2" height="2" fill={string} />
      </g>
      {state !== 'closed' && (
        <g className="parcel-sparks" fill="#f3d98b">
          <rect x="3" y="2" width="2" height="2" />
          <rect x="19" y="1" width="2" height="2" />
          <rect x="11" y="0" width="2" height="2" />
          <rect x="21" y="6" width="1" height="1" />
          <rect x="1" y="7" width="1" height="1" />
        </g>
      )}
    </svg>
  )
}
