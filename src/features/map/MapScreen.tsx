import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePublished } from '../../data/published'
import { dexById } from '../../data/catalogue'
import { ageLabel, daysAgo, filterSites } from '../../domain/ranking'
import { useTour } from '../../state/tour'
import { aBird, theBird } from '../../domain/speech'
import { shortSiteName } from '../../domain/siteName'
import { useStore, type DriveLimit } from '../../state/store'
import { useRecorded } from '../../state/useRecorded'
import { useShake } from '../../phone/shake'
import { play } from '../../audio/sfx'
import { buzz, BUZZ } from '../../phone/haptics'
import { Chip, DemoStamp, Panel, PixelIcon } from '../../ui/components'
import MapCanvas, { type MapSite } from './MapCanvas'
import { birdSrc } from './birdArt'
import { SiteCard } from './SiteCard'
import { FlyBy } from './FlyBy'
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
  // Live facts for Pearl's tour ("This card is today's pick: Rainham Marshes").
  const setTourFacts = useTour((s) => s.setFacts)
  const tourOn = useTour((s) => s.tourId !== null)
  useEffect(() => {
    const lure = active?.lure?.speciesId ? dexById(active.lure.speciesId) : undefined
    setTourFacts({
      siteName: active ? shortSiteName(active.site.name) : null,
      aBird: lure ? aBird(lure.name) : null,
      theBird: lure ? theBird(lure.name) : null,
      when: active?.lure ? daysAgo(active.lure.obsDate) : null,
      minutes: active?.minutes ?? null,
      newCount: active && active.newIds.length > 1 ? active.newIds.length : null,
    })
  }, [active, setTourFacts])

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
      {/* No banner on Explore (10 Nov): the map is the centrepiece; settings float over it. */}
      <h1 className="sr-only">Explore</h1>
      <div className="map-controls">
        <div className="map-controls-top">
        <div className="chips">
          {focusName && (
            <Chip tone="coral" active onClick={() => setFocus(null)}>
              {focusName} ✕
            </Chip>
          )}
          {LIMITS.map((l) => (
            <Chip key={l} tour="drive-chips" active={prefs.driveLimit === l} onClick={() => (setPicked(null), setPref('driveLimit', l))}>
              {l} min
            </Chip>
          ))}
          <Chip active={false} onClick={() => (window.location.hash = '#/news')}>
            Bird News{newsDot && <span className="chip-dot" role="img" aria-label="Something new" />}
          </Chip>
          <Chip tour="plan-day" active={false} onClick={() => (window.location.hash = '#/plan')}>Plan a day</Chip>
          {unexploredShown.length > 0 && !ready?.region.isDemo && (
            <Chip active={false} onClick={() => { pick(unexploredShown[newIdx % unexploredShown.length].site.id); setNewIdx(newIdx + 1) }}>
              Somewhere new
            </Chip>
          )}
          <Chip tour="find-bird" active={false} onClick={() => setFindOpen(true)}>Find a bird</Chip>
          <Chip active={prefs.unrecordedOnly} onClick={() => setPref('unrecordedOnly', !prefs.unrecordedOnly)}>
            New to me
          </Chip>
        </div>
        <a className="map-gear" href="#/settings" aria-label="Settings">
          <PixelIcon name="gear" colour="#213b32" size={24} />
        </a>
        </div>
        {ready && filtered && start && (
          <div className="map-status small">
            {/* One line that never wraps, so the map keeps its room. The full story is in the aria-label. */}
            <span className="map-status-text">
              <button type="button" className="linkish" data-tour="area" onClick={() => setAreaOpen(true)} aria-label={`Driving from ${start.label}. Change area`}>From {start.label} ▾</button> · {filtered.shown.length} sites
              {filtered.unknownDrive ? ` (+${filtered.unknownDrive} unknown drive)` : ''}
              {focus && filtered.beyondLimit ? ` · ${filtered.beyondLimit} beyond ${prefs.driveLimit} min` : ''}
              {explore && !ready.region.isDemo ? ` · explored ${explore.explored.length}/${explore.total}` : ''}
              {ready.region.isDemo ? '' : ` · ${ageLabel(ready.region.generatedAt)}`}
            </span>
            {ready.region.isDemo && <DemoStamp />}
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
          <FlyBy enabled={prefs.flyBys} busy={detailsOpen || findOpen || areaOpen || tourOn} cardH={cardH} />
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
