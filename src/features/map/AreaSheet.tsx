import type { PublishedIndex } from '../../data/published-schema'
import { BottomSheet, Chip } from '../../ui/components'

/** Quick jump between areas and start points. Opened by tapping "Driving from …" on the map. */
export function AreaSheet({ index, regionId, startId, onPick, onClose }: {
  index: PublishedIndex
  regionId: string
  startId: string
  onPick: (regionId: string, startId: string) => void
  onClose: () => void
}) {
  return (
    <BottomSheet open onClose={onClose} title="Choose an area">
      <h2 className="h-display site-name">Where are you starting?</h2>
      <p className="muted small">Sites and drive times are worked out from the start point you pick.</p>
      <div className="stack">
        {index.regions.map((r) => (
          <div key={r.id} className="stack tight">
            <strong>{r.label}{r.id === regionId ? ' (now)' : ''}</strong>
            <div className="chips">
              {r.startPoints.map((s) => (
                <Chip key={s.id} active={r.id === regionId && s.id === startId} onClick={() => onPick(r.id, s.id)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}
