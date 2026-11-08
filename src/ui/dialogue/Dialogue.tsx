import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { DIALOGUE_KIT, nineSliceCss } from '../../art/dialogueKit'
import { npcArt, npcById } from '../../art/npcs'
import { StripSprite } from './StripSprite'
import { charsShown, firstChars, portraitFor, type DialogueLine } from './typewriter'
import { useReducedMotion } from './useReducedMotion'

export type { DialogueLine }

/**
 * One character speaking a list of lines. The portrait swaps talk/neutral while a line types; tap once to finish the
 * line, tap again for the next; after the last line `onDone` fires. Reduced motion shows whole lines and never swaps.
 * The full text is always in the page for screen readers, so typing never hides it from them.
 */
export function Dialogue({ npcId, lines, onDone, onLine }: {
  npcId: string
  lines: readonly DialogueLine[]
  onDone: () => void
  /** Called with the index of each line as it appears (for a screen that shows choices after a particular line). */
  onLine?: (index: number) => void
}) {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [mouthOpen, setMouthOpen] = useState(false)
  const line = lines[Math.min(index, lines.length - 1)]
  const total = line ? [...line.text].length : 0
  const shown = reduced ? total : charsShown(line?.text ?? '', elapsed)
  const typing = shown < total
  const npc = npcById(npcId)

  const onLineRef = useRef(onLine)
  useEffect(() => {
    onLineRef.current = onLine
  })
  useEffect(() => onLineRef.current?.(index), [index])

  useEffect(() => {
    if (!typing) return
    const start = performance.now() - elapsed
    const id = window.setInterval(() => setElapsed(performance.now() - start), 30)
    return () => window.clearInterval(id)
    // `elapsed` is read once, to carry on from where it was if this effect restarts.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [typing, index])

  useEffect(() => {
    if (!typing || reduced) return
    const id = window.setInterval(() => setMouthOpen((m) => !m), 150)
    return () => window.clearInterval(id)
  }, [typing, reduced])

  const advance = useCallback(() => {
    if (!line) return onDone()
    if (typing) return setElapsed(1e9) // finish this line
    if (index + 1 >= lines.length) return onDone()
    setIndex(index + 1)
    setElapsed(0)
    setMouthOpen(false)
  }, [line, typing, index, lines.length, onDone])

  if (!npc || !line) return null
  const face = portraitFor(line, typing, mouthOpen, reduced)
  const faces = ['neutral', 'talk', 'delight'] as const
  const plate = nineSliceCss(DIALOGUE_KIT.nameplate, 2) as CSSProperties
  const box = nineSliceCss(DIALOGUE_KIT.dialogueBox, 2) as CSSProperties
  const next = DIALOGUE_KIT.next

  return (
    <div className="dlg">
      <div className="dlg-portrait">
        {faces.map((f) => {
          const art = npcArt(npcId, f)
          return art ? <img key={f} className={f === face ? 'on' : ''} src={art.src} srcSet={`${art.src} 1x, ${art.src2x} 2x`} width={128} height={128} alt={f === face ? `${npc.name}, ${npc.role}` : ''} aria-hidden={f === face ? undefined : true} draggable={false} /> : null
        })}
      </div>
      <div className="dlg-plate" style={plate}>
        {npc.name}
      </div>
      <button type="button" className="dlg-box" style={box} onClick={advance} aria-label={typing ? 'Show the whole line' : index + 1 >= lines.length ? 'Done' : 'Next line'}>
        <span className="dlg-text" aria-hidden>
          {firstChars(line.text, shown)}
          {!typing && (
            <span className="dlg-next">
              <StripSprite src={next.src} frameW={next.frames!.w} frameH={next.frames!.h} frames={next.frames!.count} fps={2} />
            </span>
          )}
        </span>
        <span className="sr-only" aria-live="polite">
          {line.text}
        </span>
      </button>
    </div>
  )
}
