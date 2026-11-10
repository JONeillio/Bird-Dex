import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { DIALOGUE_KIT } from '../../art/dialogueKit'
import { tourById, type TourStep } from '../../data/tours'
import { play } from '../../audio/sfx'
import { useStore } from '../../state/store'
import { useTour } from '../../state/tour'
import { Choices, StripSprite } from '../../ui/dialogue'
import { GuideSpeech, type GuideSpeechHandle } from '../../ui/fieldhand/GuideSpeech'
import { resolveText } from '../../ui/fieldhand/layout'
import { EXHIBIT_ART, exhibitScale } from './exhibits'
import { findTargets, routeMatches, spotlightRect, type Box } from './spotlight'

const PAD = 6

// Whether the last input was a key press (so focus moves to Pearl for keyboard users only).
let keyboardUser = false
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', () => (keyboardUser = true), true)
  window.addEventListener('pointerdown', () => (keyboardUser = false), true)
}

/** The tour layer: dims the app, spotlights one thing, and docks Pearl's bubble away from it. Mounted once in App. */
export function TourOverlay() {
  const tourId = useTour((s) => s.tourId)
  const step = useTour((s) => s.step)
  const tour = tourId ? tourById(tourId) : undefined
  if (!tour) return null
  const s = tour.steps[step]
  return <StepView key={`${tourId}:${s.id}`} step={s} index={step} total={tour.steps.length} title={tour.title} />
}

function StepView({ step, index, total, title }: { step: TourStep; index: number; total: number; title: string }) {
  const next = useTour((s) => s.next)
  const stop = useTour((s) => s.stop)
  const facts = useTour((s) => s.facts)
  const soundOn = useStore((s) => s.prefs.soundOn)
  const setPref = useStore((s) => s.setPref)
  const speech = useRef<GuideSpeechHandle>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [lineIdx, setLineIdx] = useState(0)
  const [done, setDone] = useState(false)
  const [box, setBox] = useState<Box | null>(null)

  // Go to the step's screen first.
  useEffect(() => {
    if (step.route && !routeMatches(window.location.hash, step.route)) window.location.hash = step.route
    play('blip', soundOn)
    // Keyboard users land on Pearl so Enter carries on. Touch users get no focus ring.
    if (keyboardUser) panel.current?.focus({ preventScroll: true })
    // Only when the step changes.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Find the thing to spotlight (it may still be loading or animating in), scroll it into view once, then follow it.
  useEffect(() => {
    if (!step.target && !step.selector) return
    let scrolled = false
    const look = () => {
      const els = findTargets(document, step)
      if (els.length && !scrolled) {
        scrolled = true
        els[0].scrollIntoView({ block: 'nearest', inline: 'center' })
      }
      const r = spotlightRect(els, window.innerWidth, window.innerHeight)
      setBox((b) => (b && r && b.x === r.x && b.y === r.y && b.w === r.w && b.h === r.h ? b : r))
    }
    look()
    const id = window.setInterval(look, 200)
    window.addEventListener('resize', look)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('resize', look)
    }
  }, [step])

  // "Tap the highlighted button" steps move on once you tap it (after the app has reacted).
  useEffect(() => {
    if (step.advance !== 'target') return
    const onClick = (e: MouseEvent) => {
      const els = findTargets(document, step)
      if (els.some((el) => el.contains(e.target as Node))) window.setTimeout(next, 450)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [step, next])

  const lines = step.lines
  const line = lines[lineIdx]
  const text = resolveText(line.text, line.fallback, facts)
  const lastLine = lineIdx + 1 >= lines.length
  const showChoices = !!step.choices && lastLine && done

  const advance = useCallback(() => {
    if (speech.current?.advance()) return
    if (!lastLine) {
      play('page', soundOn, 0.04)
      setDone(false)
      setLineIdx((i) => i + 1)
      return
    }
    if (step.choices) return
    next()
  }, [lastLine, step.choices, next, soundOn])

  // Skip with Escape, carry on with Enter or Space (the panel is focused).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stop])

  const choose = (id: string) => {
    if (id === 'next') next()
    else if (id === 'later') stop(false)
    else stop(true)
  }

  const dockTop = step.dock === 'top' || (step.dock === 'auto' && !!box && box.y + box.h / 2 > window.innerHeight * 0.5)
  const hole = box ? { x: box.x - PAD, y: box.y - PAD, w: box.w + PAD * 2, h: box.h + PAD * 2 } : null
  const exhibit = line.exhibit ? EXHIBIT_ART[line.exhibit] : null
  const arrow = DIALOGUE_KIT.next

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={title}>
      {hole ? (
        <>
          <div className="tour-dim" style={{ left: 0, top: 0, right: 0, height: Math.max(0, hole.y) }} onClick={advance} />
          <div className="tour-dim" style={{ left: 0, top: hole.y + hole.h, right: 0, bottom: 0 }} onClick={advance} />
          <div className="tour-dim" style={{ left: 0, top: hole.y, width: Math.max(0, hole.x), height: hole.h }} onClick={advance} />
          <div className="tour-dim" style={{ left: hole.x + hole.w, top: hole.y, right: 0, height: hole.h }} onClick={advance} />
          {/* On "tap Pearl" steps the spotlit thing is for looking at, so it can't be pressed by accident. */}
          {step.advance !== 'target' && <div className="tour-block" style={rectStyle(hole)} onClick={advance} />}
          <div className="tour-ring" style={rectStyle(hole)} aria-hidden />
        </>
      ) : (
        <div className="tour-dim" style={{ inset: 0 }} onClick={advance} />
      )}

      <div className={`tour-dock ${dockTop ? 'top' : 'bottom'}`}>
        {exhibit && (
          <div className="tour-exhibit" aria-hidden>
            <img src={exhibit.src} width={exhibit.w * exhibitScale(exhibit)} height={exhibit.h * exhibitScale(exhibit)} alt="" draggable={false} />
          </div>
        )}
        <div
          ref={panel}
          className="tour-speech"
          role="button"
          tabIndex={0}
          aria-label={done ? (showChoices ? 'Pearl has finished' : 'Next') : 'Show the whole line'}
          onClick={advance}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              advance()
            }
          }}
        >
          <GuideSpeech ref={speech} line={{ text, pose: line.pose, skin: line.skin, mirror: line.mirror }} onState={(s) => setDone(s.done && s.page + 1 >= s.pages)} />
          {done && !showChoices && (
            <span className="tour-arrow" aria-hidden>
              <StripSprite src={arrow.src} frameW={arrow.frames!.w} frameH={arrow.frames!.h} frames={arrow.frames!.count} fps={2} />
            </span>
          )}
        </div>
        {showChoices ? (
          <Choices options={step.choices!} onPick={choose} />
        ) : (
          <div className="tour-bar">
            <button type="button" className="linkish small" onClick={() => stop(true)}>
              Skip tour
            </button>
            <span className="muted small">
              {/* On "tap it" steps the hint replaces the count, so the bar never wraps on a narrow phone. */}
              {step.advance === 'target' && done && step.hint ? step.hint : `${index + 1} / ${total}`}
            </span>
            <button
              type="button"
              className="linkish small"
              aria-pressed={soundOn}
              onClick={() => {
                setPref('soundOn', !soundOn)
                // Turning sound on is a tap, so the browser lets this first sound through.
                if (!soundOn) play('blip', true)
              }}
            >
              {soundOn ? 'Sound on' : 'Sound off'}
            </button>
            <button type="button" className="btn small" onClick={() => (done && lastLine ? next() : advance())}>
              Next ▸
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function rectStyle(b: Box): CSSProperties {
  return { left: b.x, top: b.y, width: b.w, height: b.h }
}
