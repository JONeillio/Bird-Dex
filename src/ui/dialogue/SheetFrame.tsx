import type { CSSProperties, ReactNode } from 'react'
import { DIALOGUE_KIT, nineSliceCss } from '../../art/dialogueKit'

/** The Field Report card frame (nine-slice, with its four leaf sprigs), with the grab handle on top when it is a sheet. */
export function SheetFrame({ children, handle = false, className = '' }: { children: ReactNode; handle?: boolean; className?: string }) {
  const h = DIALOGUE_KIT.sheetHandle
  return (
    <div className={`sheet-frame ${className}`.trim()} style={nineSliceCss(DIALOGUE_KIT.sheetFrame, 2) as CSSProperties}>
      {handle && <img className="sheet-frame-handle" src={h.src} width={h.w * 2} height={h.h * 2} alt="" draggable={false} />}
      {children}
    </div>
  )
}
