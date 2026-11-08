import { useEffect, useState } from 'react'
import { useReducedMotion } from './useReducedMotion'

/**
 * Plays a horizontal strip of equal frames (NPC map sprites, the next arrow, thinking dots). Whole-number scale only.
 * Reduced motion holds the first frame. `playing={false}` also holds it.
 */
export function StripSprite({ src, frameW, frameH, frames, loop, fps = 2, scale = 2, playing = true, frame, label }: {
  src: string
  frameW: number
  frameH: number
  frames: number
  /** Loop only the first N frames (an NPC map strip idles on frames 0-2 and keeps frame 3 for its tap action). */
  loop?: number
  fps?: number
  scale?: number
  playing?: boolean
  /** Show this frame and do not animate (for a one-off pose such as an NPC's action frame). */
  frame?: number
  label?: string
}) {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  const cycle = loop ?? frames
  const animate = playing && !reduced && frame === undefined && cycle > 1
  useEffect(() => {
    if (!animate) return
    const id = window.setInterval(() => setI((n) => (n + 1) % cycle), Math.round(1000 / fps))
    return () => window.clearInterval(id)
  }, [animate, cycle, fps])
  const shown = frame !== undefined ? frame % frames : animate ? i : 0
  return (
    <span
      className="strip-sprite"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        width: frameW * scale,
        height: frameH * scale,
        backgroundImage: `url(${src})`,
        backgroundSize: `${frameW * frames * scale}px ${frameH * scale}px`,
        backgroundPosition: `-${shown * frameW * scale}px 0`,
      }}
    />
  )
}
