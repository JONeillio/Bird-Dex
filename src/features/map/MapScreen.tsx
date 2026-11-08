import { useCallback, useMemo, useState } from 'react'
import { usePublished } from '../../data/published'
import { dexById } from '../../data/catalogue'
import { ageLabel, filterSites } from '../../domain/ranking'
import { shortSiteName } from '../../domain/siteName'
import { useStore, type DriveLimit } from '../../state/store'
import { useRecorded } from '../../state/useRecorded'
import { useShake } from '../../phone/shake'
import { play } from '../../audio/sfx'
import { buzz, BUZZ } from '../../phone/haptics'
import { Banner, Chip, DemoStamp, Panel, Pill } from '../../ui/components'
import { SettingsButton } from '../shell/SettingsButton'
import MapCanvas, { type MapSite } from './MapCanvas'
import { birdSrc } from './birdArt'
import { SiteCard } from './SiteCard'
import { SiteSheet } from './SiteSheet'
import { FindBirdSheet } from './FindBirdSheet'
import { pickStart } from '../../data/startPoint'
import { AreaSheet } from './AreaSheet'
import { useNews } from '../../state/useNews'
import { useParcels } from '../../state/parcels'
import { useRecords } from '../../state/records'
import { exploration, visitedSiteIds } from '../../domain/explore'
import { nameForKey } from '../../domain/findBird'

const LIMITS: DriveLimit[] = [30, 60, 90]
/** Height reserved for the card until it has been measured. */
const CARD_GUESS = 150

/**
 * The Map: birding sites within the drive limit. One site is always selected (the best one to start, or the
 * one you tapped); its compact card sits at the bottom and "View spot" opens the details. Lazy-loaded.
 */
export default function MapScreen() {
  const prefs = useStore((s) => s.prefs)
  const setPref = useStore((s) => s.setPref)
  const focus = useStore((s) => s.focusSpeciesId)
  const setFocus = useStore((s) => s.setFocusSpecies)
  const focusSiteId = useStore((s) => s.focusSiteId)
  const [findOpen, setFindOpen] = useState(false)
  const [areaOpen, setAreaOpen] = useState(false)
  const { dot: newsDot } = useNews()
  const parcels = useParcels()
  const encounters = useRecords((st) => st.encounters)
  const visited = useMemo(() => visitedSiteIds(encounters), [encounters])
  const data = usePublished(prefs.regionId)
  const recorded = useRecorded()
  const [picked, setPicked] = useState<string | null>(focusSiteId)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [focusNonce, setFocusNonce] = useState(0)
  const [cardH, setCardH] = useState(CARD_GUESS)

  const ready = data.status === 'ready' ? data : null
  const ref = ready ? ready.index.regions.find((r) => r.id === ready.regionId)! : null
  const start = ref ? pickStart(ref, prefs.startId) : undefined

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

  const shown = filtered?.shown ?? []
  const explore = useMemo(() => (ready && start ? exploration(ready.region, visited, start.id) : null), [ready, start, visited])
  const unexploredShown = shown.filter((v) => !visited.has(v.site.id))
  const [newIdx, setNewIdx] = useState(0)
  // The selected site: your pick if it is still shown, otherwise the best-ranked site.
  const activeIdx = Math.max(0, shown.findIndex((v) => v.site.id === picked))
  const active = shown[activeIdx] ?? null

  const sites = useMemo<MapSite[]>(
    () =>
      shown.map((v) => ({
        id: v.site.id,
        point: v.site.point,
        newIds: v.newIds,
        isTarget: v.site.reports.some((r) => r.speciesId && prefs.targets.includes(r.speciesId)),
        label: `${shortSiteName(v.site.name)}, ${v.newIds.length} species new to you, ${v.minutes} minutes away`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, prefs.targets],
  )

  const pick = useCallback((id: string) => {
    setPicked(id)
    setDetailsOpen(false)
    setFocusNonce((n) => n + 1)
  }, [])
  const next = () => shown.length > 1 && pick(shown[(activeIdx + 1) % shown.length].site.id)
  // Shake the phone to hop to the next-best spot (only while no sheet is open).
  useShake(() => {
    if (detailsOpen || shown.length < 2) return
    next()
    play('blip', prefs.soundOn)
    buzz(BUZZ.select, prefs.hapticsOn)
  }, prefs.tiltOn)

  const focusName = focus ? (dexById(focus)?.name ?? (ready ? nameForKey(ready.region, focus) : null) ?? 'Bird') : null
  const fitKey = `${ready?.regionId}|${prefs.driveLimit}|${prefs.unrecordedOnly}|${focus}|${ready ? 'r' : ''}`

  return (
    <div className="map-screen">
      <Banner title="Map" right={<SettingsButton />} />
      <div className="map-controls">
        <div className="chips">
          {focusName && (
            <Chip tone="coral" active onClick={() => setFocus(null)}>
              {focusName} ✕
            </Chip>
          )}
          {LIMITS.map((l) => (
            <Chip key={l} active={prefs.driveLimit === l} onClick={() => (setPicked(null), setPref('driveLimit', l))}>
              {l} min
            </Chip>
          ))}
          <Chip active={false} onClick={() => (window.location.hash = '#/news')}>
            Bird News{newsDot && <span className="chip-dot" role="img" aria-label="Something new" />}
          </Chip>
          <Chip active={false} onClick={() => (window.location.hash = '#/plan')}>Plan a day</Chip>
          {unexploredShown.length > 0 && !ready?.region.isDemo && (
            <Chip active={false} onClick={() => { pick(unexploredShown[newIdx % unexploredShown.length].site.id); setNewIdx(newIdx + 1) }}>
              Somewhere new
            </Chip>
          )}
          <Chip active={false} onClick={() => setFindOpen(true)}>Find a bird</Chip>
          <Chip active={prefs.unrecordedOnly} onClick={() => setPref('unrecordedOnly', !prefs.unrecordedOnly)}>
            New to me
          </Chip>
        </div>
        {ready && filtered && start && (
          <div className="map-status small">
            <span>
              <button type="button" className="linkish" onClick={() => setAreaOpen(true)} aria-label={`Driving from ${start.label}. Change area`}>Driving from {start.label} ▾</button> · {filtered.shown.length} sites
              {filtered.unknownDrive ? ` (+${filtered.unknownDrive} unknown drive time)` : ''}
              {focus && filtered.beyondLimit ? ` · ${filtered.beyondLimit} more beyond ${prefs.driveLimit} min` : ''}
              {explore && !ready.region.isDemo ? ` · Explored ${explore.explored.length} of ${explore.total} spots` : ''}
            </span>
            {ready.region.isDemo ? <DemoStamp /> : <Pill>Updated {ageLabel(ready.region.generatedAt)}</Pill>}
          </div>
        )}
      </div>

      {parcels.length > 0 && (
        <a className="parcel-banner" href="#/journal">
          {parcels.length} new {parcels.length === 1 ? 'checklist' : 'checklists'} to open · Your Field Report
        </a>
      )}
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
            sites={sites}
            activeId={active?.site.id ?? null}
            featuredSrc={active?.lure?.speciesId ? birdSrc(active.lure.speciesId) : null}
            onSelect={pick}
            onOpen={() => setDetailsOpen(true)}
            focusNonce={focusNonce}
            fitKey={fitKey}
            insetBottom={cardH + 10}
          />
          <SiteCard
            view={active}
            position={activeIdx + 1}
            total={shown.length}
            onNext={next}
            onDetails={() => setDetailsOpen(true)}
            recorded={recorded}
            isDemo={ready.region.isDemo}
            onHeight={setCardH}
            explored={ready.region.isDemo || !active ? undefined : visited.has(active.site.id)}
          />
        </div>
      )}
      {areaOpen && ready && (
        <AreaSheet
          index={ready.index}
          regionId={ready.regionId}
          startId={start?.id ?? ''}
          onPick={(r, st) => {
            setPicked(null)
            setDetailsOpen(false)
            setPref('regionId', r)
            setPref('startId', st)
            setAreaOpen(false)
          }}
          onClose={() => setAreaOpen(false)}
        />
      )}
      {findOpen && ready && start && (
        <FindBirdSheet
          region={ready.region}
          startId={start.id}
          startLabel={start.label}
          recorded={recorded}
          onPick={(key) => {
            setFindOpen(false)
            window.location.hash = `#/find/${encodeURIComponent(key)}`
          }}
          onClose={() => setFindOpen(false)}
        />
      )}
      {ready && start && (
        <SiteSheet
          view={detailsOpen ? active : null}
          region={ready.region}
          startLabel={start.label}
          recorded={recorded}
          targets={prefs.targets}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </div>
  )
}
