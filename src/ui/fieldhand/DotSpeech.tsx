import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { DOT_ART, DOT_NAME, DOT_SKETCH, type DotPose } from '../../art/dot'
import { useReducedMotion } from '../dialogue/useReducedMotion'
import { FieldDialogue, loadFieldhand, loadImage, type DialogueState } from './FieldDialogue'

export interface DotLine {
  text: string
  pose: DotPose
  /** Gold paper for big moments (a lifer, the end of a tour). */
  skin?: 'paper' | 'lifer'
  /** Override the pose's own facing. */
  mirror?: boolean
}

export interface DotSpeechHandle {
  /** Finish the page, or turn to the next page. False once the whole line is showing. */
  advance: () => boolean
}

/**
 * Dot's speech bubble: Fieldhand letters fall in one by one and stamp upright. Purely visual: the canvas is hidden
 * from screen readers and the full line is announced once through a live region. Taps are handled by the parent
 * (so the whole panel can be the tap target); call `advance` on the handle.
 */
export function DotSpeech({ line, onState, ref, name = DOT_NAME }: {
  line: DotLine
  onState?: (s: DialogueState) => void
  ref?: Ref<DotSpeechHandle>
  name?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engine = useRef<FieldDialogue | null>(null)
  const reduced = useReducedMotion()
  const [failed, setFailed] = useState(false)
  const onStateRef = useRef(onState)
  useEffect(() => {
    onStateRef.current = onState
  })

  useImperativeHandle(ref, () => ({ advance: () => engine.current?.advance() ?? false }), [])

  useEffect(() => {
    let live = true
    let celTimer = 0
    const art = DOT_ART[line.pose]
    const animate = line.pose === 'sketching' && !reduced
    Promise.all([loadFieldhand(), loadImage(animate ? DOT_SKETCH.src : art.src)])
      .then(([res, image]) => {
        if (!live || !canvasRef.current) return
        if (!engine.current) engine.current = new FieldDialogue(canvasRef.current, res, (s) => onStateRef.current?.(s))
        const cel = (i: number) => ({ image, sx: i * DOT_SKETCH.cell, sy: 0, size: DOT_SKETCH.cell })
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
            step = (step + 1) % DOT_SKETCH.sequence.length
            engine.current?.setPortrait(cel(DOT_SKETCH.sequence[step][0]))
            celTimer = window.setTimeout(tick, DOT_SKETCH.sequence[step][1])
          }
          celTimer = window.setTimeout(tick, DOT_SKETCH.sequence[0][1])
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
