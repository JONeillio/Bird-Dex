import { useState } from 'react'
import { DIALOGUE_KIT } from '../../art/dialogueKit'
import { npcMapSprite } from '../../art/npcs'
import { Banner, Panel } from '../../ui/components'
import { Choices, Dialogue, SheetFrame, StripSprite, type DialogueLine } from '../../ui/dialogue'

// Placeholder wording for checking the pieces only. The real scripts are AUTOPILOT P12b.
const LINES: DialogueLine[] = [
  { text: 'Shh. Listen. That thin, bright phrase over the path is a wren, and it is far too loud for its size.' },
  { text: 'I record the dawn chorus here most mornings. Would you like to try telling the singers apart?' },
  { text: 'Lovely. Come back after your next visit and tell me what you heard.', expression: 'delight' },
]

/** Dialogue and sheet kit gallery at #/dev/dialogue (U0): every piece in one place to check on a phone. */
export function DevDialogue() {
  const [done, setDone] = useState(false)
  const [round, setRound] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const sprite = npcMapSprite('nell')
  const dots = DIALOGUE_KIT.thinking
  return (
    <>
      <Banner title="Dialogue kit" />
      <main className="screen stack">
        <Panel>
          <h2 className="h-display">Dialogue</h2>
          {done ? (
            <button type="button" className="btn small" onClick={() => { setDone(false); setRound((r) => r + 1) }}>
              Replay
            </button>
          ) : (
            <Dialogue key={round} npcId="nell" lines={LINES} onDone={() => setDone(true)} />
          )}
        </Panel>
        <Panel>
          <h2 className="h-display">Choices</h2>
          <Choices options={[{ id: 'wren', label: 'A wren' }, { id: 'robin', label: 'A robin' }, { id: 'unsure', label: 'Not sure yet' }]} onPick={setPicked} />
          <p>{picked ? `You picked: ${picked}` : 'Pick one.'}</p>
        </Panel>
        <Panel>
          <h2 className="h-display">Sprites</h2>
          <div className="row gap">
            {sprite && <StripSprite src={sprite.src} frameW={sprite.frameW} frameH={sprite.frameH} frames={sprite.frames} loop={3} fps={2} scale={2} label="Nell idling" />}
            {sprite && <StripSprite src={sprite.src} frameW={sprite.frameW} frameH={sprite.frameH} frames={sprite.frames} frame={sprite.actionFrame} scale={2} label="Nell's action pose" />}
            <StripSprite src={dots.src} frameW={dots.frames!.w} frameH={dots.frames!.h} frames={dots.frames!.count} fps={2} scale={2} label="Thinking" />
          </div>
        </Panel>
        <SheetFrame handle>
          <h2 className="h-display">Field Report frame</h2>
          <p>The sheet frame with its grab handle. Report content goes here.</p>
        </SheetFrame>
      </main>
    </>
  )
}
