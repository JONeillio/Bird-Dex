import { useMemo, useState } from 'react'
import { usePublished } from '../../data/published'
import { dexById } from '../../data/catalogue'
import { recordedIds } from '../../domain/collection'
import { ageLabel, filterSites } from '../../domain/ranking'
import { useStore, type DriveLimit } from '../../state/store'
import { Banner, Chip, DemoStamp, Panel, Pill, Segmented } from '../../ui/components'
import { SettingsButton } from '../shell/SettingsButton'
import MapCanvas, { type PinView } from './MapCanvas'
import type { LifeSite } from './birdLife'
import { birdSrc } from './birdArt'
import { QuestCard } from './QuestCard'
import { SiteSheet } from './SiteSheet'

const LIMITS: DriveLimit[] = [30, 60, 90]
/** Full pins for the best sites; the rest are dots. Birds hop around the best few only. */
const FULL_PINS = 20
const LIVELY_SITES = 12

/** The Map: Today's Quest, birding sites within the drive limit, and birds hopping about. Lazy-loaded. */
export default function MapScreen() {
  const prefs = useStore((s) => s.prefs)
  const setPref = useStore((s) => s.setPref)
  const focus = useStore((s) => s.focusSpeciesId)
  const setFocus = useStore((s) => s.setFocusSpecies)
  const data = usePublished(prefs.regionId)
  const recorded = useMemo(() => recordedIds(prefs), [prefs])
  const [selected, setSelected] = useState<string | null>(null)
  const [questIdx, setQuestIdx] = useState(0)

  const ready = data.status === 'ready' ? data : null
  const ref = ready ? ready.index.regions.find((r) => r.id === ready.regionId)! : null
  const start = ref?.startPoints[0]

  const filtered = useMemo(() => {
    if (!ready || !start) return null
    return filterSites(ready.region, {
      startId: start.id,
      limitMin: prefs.driveLimit,
      recorded,
      targets: prefs.targets,
      newOnly: prefs.unrecordedOnly,
      focusSpeciesId: focus,
    })
  }, [ready, start, prefs.driveLimit, recorded, prefs.targets, prefs.unrecordedOnly, focus])

  const pins = useMemo<PinView[]>(
    () =>
      (filtered?.shown ?? []).map((v, i) => ({
        view: v,
        compact: i >= FULL_PINS,
        lureSrc: v.lure?.speciesId ? birdSrc(v.lure.speciesId) : null,
        isTarget: v.site.reports.some((r) => r.speciesId && prefs.targets.includes(r.speciesId)),
        label: `${v.site.name}, ${v.newIds.length} new birds, ${v.minutes} minutes`,
      })),
    [filtered, prefs.targets],
  )

  const life = useMemo<LifeSite[]>(
    () =>
      (filtered?.shown ?? []).slice(0, LIVELY_SITES).map((v) => {
        const ids = v.site.reports.map((r) => r.speciesId).filter((x): x is string => !!x && x !== v.lure?.speciesId)
        const ordered = [...ids.filter((x) => !recorded.has(x)), ...ids.filter((x) => recorded.has(x))]
        return { id: v.site.id, point: v.site.point, birds: ordered.slice(0, 4).map(birdSrc).filter((s): s is string => !!s) }
      }),
    [filtered, recorded],
  )

  const selectedView = filtered?.shown.find((v) => v.site.id === selected) ?? null
  const focusName = focus ? dexById(focus)?.name : null
  const fitKey = `${ready?.regionId}|${prefs.driveLimit}|${prefs.unrecordedOnly}|${focus}|${ready ? 'r' : ''}`

  return (
    <div className="map-screen">
      <Banner title="Map" right={<SettingsButton />} />
      <div className="map-controls">
        {ready && ready.index.regions.length > 1 && (
          <Segmented
            label="Start from"
            options={ready.index.regions.map((r) => ({ value: r.id, label: r.label }))}
            value={ready.regionId}
            onChange={(id) => {
              setSelected(null)
              setQuestIdx(0)
              setPref('regionId', id)
              setPref('startId', id)
            }}
          />
        )}
        <div className="chips">
          {LIMITS.map((l) => (
            <Chip key={l} active={prefs.driveLimit === l} onClick={() => (setQuestIdx(0), setPref('driveLimit', l))}>
              {l} min
            </Chip>
          ))}
          <Chip active={prefs.unrecordedOnly} onClick={() => setPref('unrecordedOnly', !prefs.unrecordedOnly)}>
            New to me
          </Chip>
          {focusName && (
            <Chip tone="coral" active onClick={() => setFocus(null)}>
              {focusName} ✕
            </Chip>
          )}
        </div>
        {ready && filtered && (
          <div className="map-status small">
            <span>
              {filtered.shown.length} sites
              {filtered.unknownDrive ? ` · ${filtered.unknownDrive} with unknown drive time` : ''}
            </span>
            {ready.region.isDemo ? <DemoStamp /> : <Pill>Updated {ageLabel(ready.region.generatedAt)}</Pill>}
          </div>
        )}
      </div>

      {data.status === 'loading' && <div className="map-note">Loading sightings…</div>}
      {data.status === 'error' && (
        <main className="screen">
          <Panel>
            <h2 className="h-display">No sightings yet</h2>
            <p className="muted">{data.message} Try again later.</p>
          </Panel>
        </main>
      )}
      {ready && ref && start && filtered && (
        <div className="map-area">
          <MapCanvas
            centre={ref.centre}
            zoom={ref.zoom}
            start={start.point}
            startLabel={start.label}
            pins={pins}
            life={life}
            selectedId={selected}
            onSelect={setSelected}
            fitKey={fitKey}
          />
          {!selected && (
            <QuestCard
              views={filtered.shown}
              index={questIdx}
              onIndex={setQuestIdx}
              onView={setSelected}
              limit={prefs.driveLimit}
              onWiden={prefs.driveLimit < 90 ? () => setPref('driveLimit', 90) : null}
              isDemo={ready.region.isDemo}
              startLabel={start.label}
            />
          )}
        </div>
      )}
      {ready && start && (
        <SiteSheet
          view={selectedView}
          region={ready.region}
          startLabel={start.label}
          recorded={recorded}
          targets={prefs.targets}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
