import { bearingDeg, compassWord, distanceKm, distanceLabel, turnNeeded } from '../../domain/geo'
import { useRadarSensors } from '../../phone/compass'
import { BottomSheet } from '../../ui/components'

/**
 * "Point me there": an arrow towards a spot, drawn from your position and the phone's compass. It is a straight
 * line, not a route, so it sits beside the Directions button rather than replacing it.
 */
export function RadarSheet({ name, point, onClose }: { name: string; point: [number, number]; onClose: () => void }) {
  const { place, heading, motionDenied, needsTap, enableCompass } = useRadarSensors(true)
  const ready = place.status === 'ready' ? place : null
  const bearing = ready ? bearingDeg(ready.point, point) : null
  const km = ready ? distanceKm(ready.point, point) : null
  const turn = bearing !== null && heading !== null ? turnNeeded(bearing, heading) : null
  const facing = turn !== null && Math.abs(turn) < 12
  return (
    <BottomSheet open onClose={onClose} title="Bird radar">
      <h2 className="h-display site-name">Point me to {name}</h2>
      {place.status === 'waiting' && <p className="muted">Finding where you are… allow location when your phone asks. It is only used on this phone to point the arrow, and is never saved or sent.</p>}
      {place.status === 'denied' && <p role="alert">Location was not allowed, so I can't point the way. You can still use Directions.</p>}
      {place.status === 'unavailable' && <p role="alert">This phone could not find its location right now. You can still use Directions.</p>}
      {ready && bearing !== null && km !== null && (
        <div className="radar">
          <div className={`radar-dial ${facing ? 'on-target' : ''}`} aria-hidden="true">
            <span className="radar-n">N</span>
            <svg viewBox="-50 -50 100 100" width="150" height="150" style={{ transform: `rotate(${turn !== null ? turn : bearing}deg)` }}>
              <polygon points="0,-40 18,14 0,6 -18,14" fill="var(--coral)" stroke="var(--ink)" strokeWidth="5" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="radar-main">
            <strong>{distanceLabel(km)}</strong> to the {compassWord(bearing)}
          </p>
          {turn !== null ? (
            <p className="muted small">{facing ? 'You are facing it.' : 'Turn until the arrow points up.'}</p>
          ) : needsTap ? (
            <button type="button" className="btn small" onClick={() => void enableCompass()}>
              Turn on the compass
            </button>
          ) : (
            <p className="muted small">{motionDenied ? 'Compass access was not allowed, so the arrow shows the direction from north.' : 'No compass found, so the arrow shows the direction from north (up is north).'}</p>
          )}
          <p className="muted small">Straight-line distance, not a driving route. Accuracy about {Math.round(ready.accuracy)} m.</p>
        </div>
      )}
      <a className="btn block" href={`https://www.google.com/maps/dir/?api=1&destination=${point[1]},${point[0]}`} target="_blank" rel="noopener">
        Driving directions
      </a>
    </BottomSheet>
  )
}
