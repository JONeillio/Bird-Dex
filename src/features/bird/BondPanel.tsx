import { useMemo, useState } from 'react'
import { BOND_POINTS, bondRun, RANKS, RANK_THRESHOLDS } from '../../domain/bond'
import { fieldNotes, missingMonths } from '../../domain/fieldNotes'
import { formatDate } from '../../domain/journal'
import { useGame, prefsOf } from '../../state/game'
import { useRecords } from '../../state/records'
import { Panel } from '../../ui/components'
import { RankPips } from '../birddex/RankPips'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const NICK_MIN_RANK = 2 // Familiar

/** Rank, progress to the next rank, how Bond grows, field notes and a nickname. Only for birds you have logged. */
export function BondPanel({ speciesId, name }: { speciesId: string; name: string }) {
  const encounters = useRecords((s) => s.encounters)
  const bond = useMemo(() => bondRun(encounters).bonds.get(speciesId), [encounters, speciesId])
  const nickname = useGame((s) => prefsOf(s.docs).nicknames[speciesId] ?? '')
  const setNickname = useGame((s) => s.setNickname)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  if (!bond) return null

  const start = RANK_THRESHOLDS[bond.rankIndex]
  const pct = bond.nextRankAt === null ? 100 : Math.round(((bond.points - start) / (bond.nextRankAt - start)) * 100)
  const next = RANKS[bond.rankIndex + 1]
  const notes = bond.rankIndex >= 1 ? fieldNotes(speciesId) : ''
  const left = missingMonths(bond)

  return (
    <Panel className="stack tight bond-panel">
      <div className="row spread">
        <h3 className="h-display small-h">Field Bond</h3>
        <span className="row tight-row">
          <RankPips rankIndex={bond.rankIndex} />
          <strong>{bond.rank}</strong>
        </span>
      </div>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Bond progress to ${next ?? 'the top'}`}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className="muted small">
        {next && bond.nextRankAt !== null ? `${bond.points} / ${bond.nextRankAt} Bond to ${next}` : `${bond.points} Bond. Old Friend is the top rank.`}
      </p>

      {nickname && <p className="nick">"{nickname}"</p>}
      {bond.rankIndex >= NICK_MIN_RANK &&
        (editing ? (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault()
              void setNickname(speciesId, draft.trim())
              setEditing(false)
            }}
          >
            <input className="search" maxLength={24} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`Nickname for ${name}`} placeholder="Nickname" autoFocus />
            <button type="submit" className="btn small primary">Save</button>
          </form>
        ) : (
          <button type="button" className="linkish" onClick={() => { setDraft(nickname); setEditing(true) }}>
            {nickname ? 'Change nickname' : 'Give it a nickname'}
          </button>
        ))}

      {notes && <p className="small"><strong>Field notes:</strong> {notes}</p>}
      {bond.rankIndex === 4 && bond.firstDate && (
        <p className="small">
          First seen {formatDate(bond.firstDate)}{bond.firstPlace ? ` at ${bond.firstPlace}` : ''}, {bond.sightings} sightings across {bond.sites} {bond.sites === 1 ? 'site' : 'sites'}.
        </p>
      )}
      <p className="muted small">
        {bond.sightings} {bond.sightings === 1 ? 'sighting' : 'sightings'} · {bond.sites} {bond.sites === 1 ? 'place' : 'places'} · {bond.months} of 12 months
        {left.length > 0 && left.length <= 6 ? ` (not yet in ${left.map((m) => MONTHS[m - 1]).join(', ')})` : ''}
      </p>

      <details className="how-bond">
        <summary>How Bond grows</summary>
        <ul className="small">
          <li>First time you record it: {BOND_POINTS.first} points</li>
          <li>A place you have not seen it before: {BOND_POINTS.newSite}</li>
          <li>A month you have not seen it in: {BOND_POINTS.newMonth}</li>
          <li>A time of day you have not seen it at: {BOND_POINTS.newBand}</li>
          <li>The first sighting of a new calendar year: {BOND_POINTS.newYear}. The first time you hear it: {BOND_POINTS.firstHeard}</li>
          <li>Any other sighting: {BOND_POINTS.other}. The same bird, place and day earns nothing.</li>
        </ul>
        <p className="muted small">Ranks: {RANKS.map((r, i) => `${r} ${RANK_THRESHOLDS[i]}`).join(' · ')}. Only your own logged or imported sightings count.</p>
      </details>
    </Panel>
  )
}
