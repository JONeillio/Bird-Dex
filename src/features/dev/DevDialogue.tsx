import { useState } from 'react'
import { DIALOGUE_KIT } from '../../art/dialogueKit'
import { npcMapSprite } from '../../art/npcs'
import { Banner, Panel } from '../../ui/components'
import { Choices, Dialogue, SheetFrame, StripSprite, type DialogueLine } from '../../ui/dialogue'
import { useRef } from 'react'
import { GUIDE_ART, GUIDE_POSES } from '../../art/guide'
import { GuideSpeech, type GuideLine, type GuideSpeechHandle } from '../../ui/fieldhand/GuideSpeech'

// The kit's own example moments (dialogue-scenes.json), to check the falling letters, both skins and every pose.
const DOT_SCENES: { label: string; line: GuideLine }[] = [
  { label: 'Chat', line: { pose: 'chat', text: 'Hello, love. I’m Pearl. Forty years painting shop signs in Deptford.' } },
  { label: 'Introduce', line: { pose: 'introduce', text: 'Here’s what birders have seen lately. Each row has a date and a checklist.' } },
  { label: 'Clarify', line: { pose: 'clarify', text: 'See the date? That’s when the gull was seen.' } },
  { label: 'Compare', line: { pose: 'compare', text: 'Six days ago is when. Sixty is how many. Quite a crowd.' } },
  { label: 'Aside', line: { pose: 'aside', text: 'Sixty gulls. I’d eat those chips somewhere else.' } },
  { label: 'Over to you', line: { pose: 'over-to-you', text: 'I fancy the redshank. What about you?' } },
  { label: 'New bird', line: { pose: 'delighted', skin: 'lifer', text: 'Your first wren. There. I’ll put the date under that one.' } },
  { label: 'A field mark', line: { pose: 'explaining', text: 'See that tail? Sticks up like a teapot handle.' } },
  { label: 'Sketching', line: { pose: 'sketching', text: 'Round body. Tail up. Feet can wait.' } },
  { label: 'Same wren', line: { pose: 'talking', text: 'I drew you a kingfisher. Looks a lot like a wren. They all do, love.' } },
  { label: 'Slipped away', line: { pose: 'missed-sighting', text: 'Well. Got the back half of him. That’s the useful half of a wren.' } },
  { label: 'A quiet word', line: { pose: 'sympathy', text: 'I’ve got a whole book of ones that got away. Sit with me a bit.' } },
  { label: 'Two pages', line: { pose: 'chat', text: 'This one is long on purpose, to check that a line which runs past four rows turns over to a second page when you tap, rather than squashing itself up or running out of the bubble at the bottom.' } },
]

function DotGallery() {
  const [i, setI] = useState(0)
  const [round, setRound] = useState(0)
  const [state, setState] = useState('')
  const ref = useRef<GuideSpeechHandle>(null)
  const scene = DOT_SCENES[i]
  return (
    <Panel>
      <h2 className="h-display">Pearl (Fieldhand)</h2>
      <div className="tour-speech" role="button" tabIndex={0} onClick={() => ref.current?.advance()} aria-label="Finish or turn the page">
        <GuideSpeech key={`${i}-${round}`} ref={ref} line={scene.line} onState={(s) => setState(s.done ? `Done · page ${s.page + 1} of ${s.pages}` : 'Writing…')} />
      </div>
      <p className="muted small">{state} · tap the bubble to finish</p>
      <div className="chips wrap">
        {DOT_SCENES.map((s, n) => (
          <button key={s.label} type="button" className="chip" aria-pressed={n === i} onClick={() => (setI(n), setRound((r) => r + 1))}>
            {s.label}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={false} onClick={() => setRound((r) => r + 1)}>
          Replay
        </button>
      </div>
      <div className="row gap wrap">
        {GUIDE_POSES.map((p) => (
          <img key={p} src={GUIDE_ART[p].src} width={96} height={96} alt={p} title={GUIDE_ART[p].use} style={{ imageRendering: 'pixelated' }} />
        ))}
      </div>
    </Panel>
  )
}

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
        <DotGallery />
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
