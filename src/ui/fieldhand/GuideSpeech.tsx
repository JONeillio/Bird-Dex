import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { GUIDE_ART, GUIDE_NAME, GUIDE_SKETCH, type GuidePose } from '../../art/guide'
import { useReducedMotion } from '../dialogue/useReducedMotion'
import { voice } from '../../audio/sfx'
import { useStore } from '../../state/store'
import { FieldDialogue, loadFieldhand, loadImage, type DialogueState } from './FieldDialogue'

export interface GuideLine {
  text: string
  pose: GuidePose
  /** Gold paper for big moments (a lifer, the end of a tour). */
  skin?: 'paper' | 'lifer'
  /** Override the pose's own facing. */
  mirror?: boolean
}

export interface GuideSpeechHandle {
  /** Finish the page, or turn to the next page. False once the whole line is showing. */
  advance: () => boolean
}

/**
 * Pearl's speech bubble: Fieldhand letters fall in one by one and stamp upright. Purely visual: the canvas is hidden
 * from screen readers and the full line is announced once through a live region. Taps are handled by the parent
 * (so the whole panel can be the tap target); call `advance` on the handle.
 */
export function GuideSpeech({ line, onState, ref, name = GUIDE_NAME }: {
  line: GuideLine
  onState?: (s: DialogueState) => void
  ref?: Ref<GuideSpeechHandle>
  name?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engine = useRef<FieldDialogue | null>(null)
  const reduced = useReducedMotion()
  const [failed, setFailed] = useState(false)
  const onStateRef = useRef(onState)
  const soundOn = useStore((s) => s.prefs.soundOn)
  const soundRef = useRef(soundOn)
  useEffect(() => {
    onStateRef.current = onState
    soundRef.current = soundOn
  })

  useImperativeHandle(ref, () => ({ advance: () => engine.current?.advance() ?? false }), [])

  useEffect(() => {
    let live = true
    let celTimer = 0
    const art = GUIDE_ART[line.pose]
    const animate = line.pose === 'sketching' && !reduced
    Promise.all([loadFieldhand(), loadImage(animate ? GUIDE_SKETCH.src : art.src)])
      .then(([res, image]) => {
        if (!live || !canvasRef.current) return
        if (!engine.current) engine.current = new FieldDialogue(canvasRef.current, res, (s) => onStateRef.current?.(s))
        // Her "voice": a soft blip on every other letter as it falls (only with sound on).
        engine.current.onLetter = (ch, i) => {
          if (i % 2 === 0) voice(ch, soundRef.current)
        }
        const cel = (i: number) => ({ image, sx: i * GUIDE_SKETCH.cell, sy: 0, size: GUIDE_SKETCH.cell })
        engine.current.say({
          text: line.text,
          portrait: animate ? cel(0) : { image },
          mouth: art.mouth,
          mirror: line.mirror ?? art.mirror,
          skin: line.skin ?? 'paper',
          name,
          reducedMotion: reduced,
        })
        if (animate) {
          let step = 0
          const tick = () => {
            step = (step + 1) % GUIDE_SKETCH.sequence.length
            engine.current?.setPortrait(cel(GUIDE_SKETCH.sequence[step][0]))
            celTimer = window.setTimeout(tick, GUIDE_SKETCH.sequence[step][1])
          }
          celTimer = window.setTimeout(tick, GUIDE_SKETCH.sequence[0][1])
        }
      })
      .catch(() => {
        if (live) {
          setFailed(true)
          onStateRef.current?.({ done: true, page: 0, pages: 1 })
        }
      })
    return () => {
      live = false
      clearTimeout(celTimer)
      engine.current?.stop()
    }
  }, [line.text, line.pose, line.skin, line.mirror, reduced, name])

  useEffect(() => () => engine.current?.destroy(), [])

  return (
    <div className="fh-speech">
      {failed ? (
        // Art could not load (offline first visit): plain text still teaches the same thing.
        <p className="fh-fallback">
          <strong>{name}:</strong> {line.text}
        </p>
      ) : (
        <canvas ref={canvasRef} className="fh-canvas" width={360} height={166} aria-hidden />
      )}
      <span className="sr-only" aria-live="polite">
        {name}: {line.text}
      </span>
    </div>
  )
}
