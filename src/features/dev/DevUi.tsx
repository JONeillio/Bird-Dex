import { useState } from 'react'
import { ICON_GRIDS, type IconName } from '../../art/icons'
import { BottomSheet, Chip, DemoStamp, Panel, Pill, PixelIcon, Segmented } from '../../ui/components'
import { Banner } from '../../ui/components'

/** Component gallery at #/dev/ui: one place to check every recipe on a phone. */
export function DevUi() {
  const [skin, setSkin] = useState<'adventure' | 'field'>('adventure')
  const [limit, setLimit] = useState<30 | 60 | 90>(60)
  const [target, setTarget] = useState(false)
  const [sheet, setSheet] = useState(false)

  return (
    <>
      <Banner title="UI kit" />
      <main className="screen stack">
        <Panel>
          <h2 className="h-display">Panel</h2>
          <p>Body text in Nunito at 16px. Numbers stay steady: 0123456789.</p>
          <div className="row">
            <DemoStamp />
            <Pill>Not yet recorded</Pill>
            <Pill tone="good">24 recorded</Pill>
            <Pill tone="warn">Drive time unknown</Pill>
          </div>
        </Panel>

        <Segmented
          label="Map skin"
          value={skin}
          onChange={setSkin}
          options={[
            { value: 'adventure', label: 'Adventure' },
            { value: 'field', label: 'Field' },
          ]}
        />

        <div className="chips" role="group" aria-label="Drive limit">
          {([30, 60, 90] as const).map((m) => (
            <Chip key={m} active={limit === m} onClick={() => setLimit(m)}>
              {m} min
            </Chip>
          ))}
          <Chip tone="coral" active={target} onClick={() => setTarget(!target)}>
            Target
          </Chip>
        </div>

        <div className="row">
          <button type="button" className="btn primary">
            Find nearby
          </button>
          <button type="button" className="btn">
            Listen
          </button>
          <button type="button" className="btn block" onClick={() => setSheet(true)}>
            Open a bottom sheet
          </button>
        </div>

        <div className="card-grid">
          <div className="card">
            <span className="tick" aria-label="Recorded">
              ✓
            </span>
            <PixelIcon name="bird" size={64} colour="#d9663a" />
            <span>Robin</span>
            <span className="dexno">#057</span>
          </div>
          <div className="card">
            <PixelIcon name="bird" size={64} colour="#8e938a" />
            <span>Kingfisher</span>
            <span className="dexno">#041</span>
          </div>
        </div>

        <Panel>
          <h2 className="h-display" style={{ fontSize: 22 }}>
            Pixel icons
          </h2>
          <div className="row">
            {(Object.keys(ICON_GRIDS) as IconName[]).map((n) => (
              <div key={n} style={{ textAlign: 'center' }}>
                <PixelIcon name={n} size={48} />
                <div className="muted" style={{ fontSize: 13 }}>
                  {n}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Example sheet">
          <h2 className="h-display" style={{ fontSize: 24 }}>
            Pennington Flash
          </h2>
          <p className="muted">34 min from Chorlton Green · last report yesterday</p>
          <button type="button" className="btn primary block" onClick={() => setSheet(false)}>
            Done
          </button>
        </BottomSheet>
      </main>
    </>
  )
}
