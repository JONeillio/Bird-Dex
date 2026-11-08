import { npcDataById } from '../../data/game'
import { npcArt } from '../../art/npcs'
import { KEEPSAKES } from '../../art/keepsakes'
import { homesByNpc, meetHint, stages } from '../../domain/folk'
import { useGame } from '../../state/game'
import { shortSiteName } from '../../domain/siteName'
import { Banner, Panel } from '../../ui/components'
import { BackButton } from '../shell/SettingsButton'
import { useFolk } from './useFolk'

/** A light story-folk page: who they are, what they said when you met, and their keepsake. Their challenges come later. */
export default function NpcScreen({ id }: { id: string }) {
  const f = useFolk()
  const docs = useGame((s) => s.docs)
  const n = npcDataById(id)
  if (!n) {
    return (
      <>
        <Banner title="Folk" left={<BackButton to="#/folk" />} />
        <main className="screen"><p className="muted center">Nobody here by that name.</p></main>
      </>
    )
  }
  const homes = homesByNpc(Object.values(docs))
  const home = f.region?.sites.find((x) => (homes[n.id] ?? []).includes(x.id))
  const stage = stages([n], homes, f.encounters, Object.values(docs))[n.id]
  const met = stage !== 'unmet'
  const art = npcArt(n.id, met ? 'talk' : 'neutral')
  const keep = KEEPSAKES.find((k) => k.npcId === n.id)
  const got = stage === 'done' || stage === 'returned'
  return (
    <>
      <Banner title="Folk" left={<BackButton to="#/folk" />} />
      <main className="screen stack">
        <Panel className="folk-card">
          {art && <img className={`warden-img ${met ? '' : 'portrait-sil'}`} src={art.src} srcSet={`${art.src} 1x, ${art.src2x} 2x`} width={112} height={112} alt={met ? n.name : 'Someone you have not met'} draggable={false} />}
          <div>
            <h2 className="h-display">{met ? n.name : 'Not met yet'}</h2>
            <p className="muted small">{met ? n.role : meetHint(n, home ? shortSiteName(home.name) : null)}</p>
            {met && home && <p className="muted small">Lives at {shortSiteName(home.name)}.</p>}
          </div>
        </Panel>
        {met && <Panel><p>"{stage === 'returned' ? n.returnLine : n.opening}"</p></Panel>}
        {keep && (
          <Panel className="row">
            <img src={keep.src} width={64} height={64} alt={keep.label} className={got ? '' : 'portrait-sil'} />
            <span className="small">{got ? n.keepsake : 'Their keepsake. Meet them and finish their challenge to earn it.'}</span>
          </Panel>
        )}
        {met && !got && <p className="muted small">Their challenge arrives in a later update.</p>}
      </main>
    </>
  )
}
