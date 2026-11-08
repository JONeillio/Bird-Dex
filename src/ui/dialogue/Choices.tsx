import type { CSSProperties } from 'react'
import { DIALOGUE_KIT, nineSliceCss } from '../../art/dialogueKit'

/** Answer buttons for a dialogue: real buttons, at least 48 px tall (the art is 24 px at scale 2). */
export function Choices({ options, onPick, disabled = false }: { options: readonly { id: string; label: string }[]; onPick: (id: string) => void; disabled?: boolean }) {
  const rest = nineSliceCss(DIALOGUE_KIT.choiceButton, 2) as CSSProperties
  const pressed = nineSliceCss(DIALOGUE_KIT.choiceButtonPressed, 2)
  const vars = { '--choice-pressed': pressed.borderImageSource } as CSSProperties
  return (
    <div className="dlg-choices" role="group" aria-label="Your answer" style={vars}>
      {options.map((o) => (
        <button key={o.id} type="button" className="dlg-choice" style={rest} disabled={disabled} onClick={() => onPick(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
