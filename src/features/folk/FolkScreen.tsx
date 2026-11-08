import { useEffect } from 'react'
import { NPC_DATA, type Warden } from '../../data/game'
import { assignHomes, homesByNpc, meetHint, stages } from '../../domain/folk'
import { earnedBadges } from '../../domain/badges'
import { personaById } from '../../data/personas'
import { npcArt } from '../../art/npcs'
import { trust } from '../../domain/wardenJobs'
import { useGame } from '../../state/game'
import { useStore } from '../../state/store'
import { Banner, DemoStamp, Panel, Pill } from '../../ui/components'
import { SettingsButton } from '../shell/SettingsButton'
import { BadgePin } from './BadgePin'
import { WardenPortrait } from './WardenPortrait'
import { useFolk } from './useFolk'

/** People: the Reserve Wardens at real sites, your Call it results, the badge case and the story folk. */
export default function FolkScreen() {
  const f = useFolk()
  const demo = useStore((s) => s.prefs.demoCollection)
  const docs = useGame((s) => s.docs)
  const setNpcHomes = useGame((s) => s.setNpcHomes)
  const regionDocId = `npcHomes:${f.regionId}`

  // Give each story folk a home the first time this region's data is here (kept stable after that).
  useEffect(() => {
    if (!f.region || f.region.isDemo || docs[regionDocId]) return
    void setNpcHomes(f.regionId, assignHomes(f.region, NPC_DATA, f.wardens))
  }, [f.region, f.regionId, f.wardens, docs, regionDocId, setNpcHomes])

  const badges = earnedBadges({ encounters: f.encounters, wardens: f.wardens, callWins: f.callWins, year: f.now.getFullYear(), demoCollection: demo })
  const earned = badges.wardens.filter((w) => w.tier !== 'none').length + badges.sets.filter((s) => s.earned).length + badges.year.badges.filter((b) => b.earned).length
  const wins = Object.keys(f.callWins).length
  const pending = f.calls.filter((c) => c.settlement.result === 'pending')
  const homes = homesByNpc(Object.values(docs))
  const stage = stages(NPC_DATA, homes, f.encounters, Object.values(docs))

  return (
    <>
      <Banner title="Folk" right={<SettingsButton />} />
      <main className="screen stack">
        {f.isDemo && <DemoStamp />}
        <div className="row two">
          <a className="btn block" href="#/badges"><BadgePin tier={earned > 0 ? 'gold' : 'none'} size={22} /> Badges ({earned})</a>
          <div className="btn block static">Call it wins: {wins}</div>
        </div>
        {pending.length > 0 && (
          <Panel className="stack tight">
            <h3 className="h-display small-h">Waiting on your next visit</h3>
            {pending.map(({ call }) => (
              <a key={call.id} href={`#/folk/callit/${call.wardenId}`}>
                {personaById(call.wardenId.split('-')[0])?.name ?? 'A warden'}: your call is open until {call.expiresOn}
              </a>
            ))}
          </Panel>
        )}

        <h2 className="h-display">Reserve Wardens</h2>
        {f.wardens.length === 0 && <p className="muted">No wardens here yet.</p>}
        {f.wardens.map((w) => (
          <WardenCard key={w.id} w={w} met={f.visited.has(w.siteId)} level={trust(w, f.real, f.now).level} tier={badges.wardens.find((b) => b.wardenId === w.id)?.tier ?? 'none'} />
        ))}

        <h2 className="h-display">Story folk</h2>
        <p className="muted small">People who live near the places you bird. You meet them by visiting.</p>
        {NPC_DATA.map((n) => {
          const art = npcArt(n.id, 'neutral')
          const met = stage[n.id] !== 'unmet'
          return (
            <a key={n.id} className="folk-card panel" href={`#/folk/npc/${n.id}`}>
              {art && <img className={`warden-img ${met ? '' : 'portrait-sil'}`} src={art.src} width={64} height={64} alt={met ? n.name : 'Someone you have not met'} draggable={false} />}
              <div>
                <strong>{met ? n.name : 'Not met yet'}</strong>
                <br />
                <span className="muted small">{met ? n.role : meetHint(n)}</span>
              </div>
              {stage[n.id] === 'done' || stage[n.id] === 'returned' ? <Pill tone="good">Keepsake</Pill> : null}
            </a>
          )
        })}
      </main>
    </>
  )
}

function WardenCard({ w, met, level, tier }: { w: Warden; met: boolean; level: string; tier: 'none' | 'bronze' | 'silver' | 'gold' }) {
  const p = personaById(w.persona)
  return (
    <a className="folk-card panel" href={`#/folk/warden/${w.id}`}>
      <WardenPortrait persona={w.persona} met={met} size={72} />
      <div>
        <strong>{met ? (p?.name ?? 'Warden') : 'A warden you have not met'}</strong>
        <br />
        <span className="muted small">{w.siteName}</span>
        <br />
        <span className="small">{met ? level : 'Visit to meet them'}</span>
      </div>
      <BadgePin tier={tier} />
    </a>
  )
}
