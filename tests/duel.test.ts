import { describe, expect, it } from 'vitest'
import { DUEL_CARDS, cardForId, type DuelCard } from '../src/data/game'
import type { Encounter } from '../src/data/personal-schema'
import type { Report, Site } from '../src/data/published-schema'
import { computeBond, type Bond } from '../src/domain/bond'
import {
  affinityFor, affinityLevel, bestPlayerPick, buildDuel, chooseOpponent, defaultSquad, drawCards, fitBreakdown, fitOf, outcome,
  playRound, playerFighter, resolveSquad, scoreOf, setupWardenDuel, tally, wardenSquad, type Fighter, type RoundResult,
} from '../src/domain/duel'

const card = (id: string) => cardForId(id)!
let n = 0
function enc(over: Partial<Encounter> = {}): Encounter {
  n += 1
  return {
    id: `enc${String(n).padStart(6, '0')}`, speciesId: 'european-robin', date: '2026-05-10', place: 'Reedbed', mode: 'seen', notes: '', photo: null,
    createdAt: `2026-11-08T10:00:${String(n % 60).padStart(2, '0')}.000Z`, siteId: 'L100001', time: '06:30', ...over,
  }
}
const many = (count: number, over: Partial<Encounter> = {}) => Array.from({ length: count }, (_, i) => enc({ date: `2026-05-${String(i + 1).padStart(2, '0')}`, ...over }))
const chars = new Map([['L100001', ['woodland' as const]], ['L100002', ['wetland' as const]]])
/** A card with no habitat and no rules, so every bird fits it equally (fit 1). */
const flatCard: DuelCard = { id: 'flat', name: 'Flat', flavour: 'Nothing special.', sets: [], months: null, band: null, rules: [], affinity: 'context' }
const rep = (speciesId: string): Report => ({ speciesId, ebirdCode: 'x', name: speciesId, sciName: 'Fakeus fakeus', obsDate: '2026-11-06', obsTime: null, count: null, checklistUrl: null, reviewed: false })
const siteOf = (ids: string[]): Pick<Site, 'id' | 'reports'> => ({ id: 'L100001', reports: ids.map(rep) })
const fighter = (id: string, affinity = 1, bond: 0 | 1 = 0): Fighter => ({ id, bond, affinity: () => affinity })

describe('fit (E1)', () => {
  it('habitat point plus one per rule matched', () => {
    // robin: garden/woodland, songster, eats insects. Dawn chorus favours woodland/garden, songster, insects.
    expect(fitBreakdown('european-robin', card('dawn-chorus'))).toMatchObject({ habitat: true, fit: 3 })
    expect(fitBreakdown('european-robin', card('dawn-chorus')).matched).toEqual([{ songster: true }, { diet: ['insects'] }])
    // mute swan: wetland, not a songster, eats plants. Nothing matches dawn chorus.
    expect(fitBreakdown('mute-swan', card('dawn-chorus'))).toMatchObject({ habitat: false, fit: 0, matched: [] })
  })

  it('a card with no habitat gives the habitat point to every bird', () => {
    expect(fitOf('mute-swan', flatCard)).toBe(1)
    // fog: no habitat; songster or crepuscular/nocturnal
    expect(fitOf('european-robin', card('fog'))).toBe(2) // habitat + songster
    expect(fitOf('common-snipe', card('fog'))).toBe(2) // habitat + crepuscular
    expect(fitOf('mute-swan', card('fog'))).toBe(1)
  })

  it('fit is at most 3 and a bird outside the Dex fits nothing', () => {
    for (const c of DUEL_CARDS) for (const id of ['european-robin', 'mute-swan', 'common-buzzard', 'tawny-owl']) expect(fitOf(id, c)).toBeLessThanOrEqual(3)
    expect(fitOf('x-regulus-ignicapilla', flatCard)).toBe(0)
  })

  it('size, status and activity rules work', () => {
    expect(fitBreakdown('eurasian-bittern', card('reedbed-dusk'))).toMatchObject({ habitat: true, fit: 3 }) // wetland, crepuscular, fish
    expect(fitBreakdown('common-buzzard', card('thermals'))).toMatchObject({ habitat: true, fit: 3 }) // raptors, large, prey
    expect(fitBreakdown('tawny-owl', card('night-watch')).fit).toBe(3) // woodland/raptors, nocturnal, prey
  })
})

describe('affinity (E1)', () => {
  it('0 sightings is 0, 1-2 is 1, 3 or more is 2', () => {
    expect([0, 1, 2, 3, 4, 40].map(affinityLevel)).toEqual([0, 1, 1, 2, 2, 2])
  })

  it('counts sightings in matching site, month and time band', () => {
    const dawn = card('dawn-chorus') // woodland/garden, Mar-Jul, dawn
    expect(affinityFor('european-robin', dawn, many(3), chars)).toBe(2)
    expect(affinityFor('european-robin', dawn, many(2), chars)).toBe(1)
    // wrong site character, wrong month, wrong time band, no time: none match
    expect(affinityFor('european-robin', dawn, many(3, { siteId: 'L100002' }), chars)).toBe(0)
    expect(affinityFor('european-robin', dawn, many(3, { date: '2026-10-10' }), chars)).toBe(0)
    expect(affinityFor('european-robin', dawn, many(3, { time: '15:00' }), chars)).toBe(0)
    expect(affinityFor('european-robin', dawn, many(3, { time: null }), chars)).toBe(0)
  })

  it('only counts the bird itself', () => {
    expect(affinityFor('eurasian-wren', card('dawn-chorus'), many(5), chars)).toBe(0)
  })

  it('a sighting with no known site only matches cards with no habitat', () => {
    const noSite = many(3, { siteId: null })
    expect(affinityFor('european-robin', card('dawn-chorus'), noSite, chars)).toBe(0)
    expect(affinityFor('european-robin', card('dawn-chorus'), many(3, { siteId: 'L555555' }), chars)).toBe(0) // not in the region data
    expect(affinityFor('european-robin', flatCard, noSite, chars)).toBe(2)
  })

  it('an undated sighting cannot match a card that needs a month', () => {
    expect(affinityFor('european-robin', card('dawn-chorus'), many(3, { date: null }), chars)).toBe(0)
    expect(affinityFor('european-robin', flatCard, many(3, { date: null }), chars)).toBe(2)
  })

  it('heard cards count heard or seen-and-heard sightings anywhere', () => {
    const fog = card('fog')
    expect(fog.affinity).toBe('heard')
    const e = [...many(2, { mode: 'heard', siteId: null, date: null }), ...many(1, { mode: 'both' }), ...many(5, { mode: 'seen' })]
    expect(affinityFor('european-robin', fog, e, chars)).toBe(2)
    expect(affinityFor('european-robin', fog, many(5, { mode: 'seen' }), chars)).toBe(0)
  })
})

describe('score (E1)', () => {
  it('is fit + affinity + bond point, at most 6', () => {
    const f = playerFighter('european-robin', { rankIndex: 3 } as Bond, many(3), chars)
    expect(scoreOf(f, card('dawn-chorus'))).toEqual({ fit: 3, affinity: 2, bond: 1, total: 6 })
  })

  it('the Bond point needs Seasoned or Old Friend', () => {
    const at = (rankIndex: number) => scoreOf(playerFighter('european-robin', { rankIndex } as Bond, [], chars), flatCard).bond
    expect([0, 1, 2, 3, 4].map(at)).toEqual([0, 0, 0, 1, 1])
    expect(scoreOf(playerFighter('european-robin', undefined, [], chars), flatCard).bond).toBe(0)
  })
})

describe('the draw (E1)', () => {
  const opts = { seed: 'L100001' + '2026-11-08', month: 11, band: null, siteSets: ['wetland' as const] }

  it('is deterministic for the same seed and different for a different seed', () => {
    const a = drawCards(opts).map((c) => c.id)
    expect(drawCards(opts).map((c) => c.id)).toEqual(a)
    const others = Array.from({ length: 10 }, (_, i) => drawCards({ ...opts, seed: `L100001-day-${i}` }).map((c) => c.id).join())
    expect(new Set(others).size).toBeGreaterThan(1)
  })

  it('gives five distinct cards valid for every month, for every site type and for rivals', () => {
    for (let month = 1; month <= 12; month++) {
      for (const siteSets of [['wetland'], ['woodland', 'garden'], ['raptors'], ['coast'], ['farmland-upland'], null] as const) {
        for (const seed of ['a', 'b', 'c']) {
          const cards = drawCards({ seed, month, band: null, siteSets })
          expect(cards).toHaveLength(5)
          expect(new Set(cards.map((c) => c.id)).size).toBe(5)
          for (const c of cards) expect(!c.months || c.months.includes(month)).toBe(true)
        }
      }
    }
  })

  it('prefers cards that fit the site, then fills with other month-valid cards', () => {
    // winter, raptors site: only a few cards fit, so it must be filled up to five from other cards valid in January
    const cards = drawCards({ seed: 's', month: 1, band: null, siteSets: ['raptors'] })
    expect(cards).toHaveLength(5)
    const fitting = cards.filter((c) => c.sets.length === 0 || c.sets.includes('raptors'))
    expect(fitting.length).toBeGreaterThan(0)
    expect(cards.map((c) => c.id)).not.toContain('thermals') // not valid in January
  })

  it('a card whose time band matches now is round 1', () => {
    const dusk = drawCards({ seed: 'x', month: 11, band: 'dusk', siteSets: ['wetland'] })
    expect(dusk[0].band).toBe('dusk')
    expect(dusk[0].id).toBe('reedbed-dusk')
    const night = drawCards({ seed: 'x', month: 11, band: 'night', siteSets: ['woodland'] })
    expect(night[0].id).toBe('night-watch')
    // no card for that band at this site: nothing is forced
    const none = drawCards({ seed: 'x', month: 11, band: 'dawn', siteSets: ['wetland'] })
    expect(none[0].band === 'dawn').toBe(false)
  })
})

describe('warden squad (E1)', () => {
  const cards = [card('reedbed-dusk'), card('open-water'), card('low-tide'), card('fog'), flatCard]

  it('is the boss plus the five reported birds with the best total fit', () => {
    const reported = ['mute-swan', 'common-snipe', 'common-kingfisher', 'mallard', 'great-cormorant', 'european-robin', 'eurasian-wren', 'eurasian-bittern']
    const squad = wardenSquad('eurasian-bittern', siteOf(reported), cards)
    expect(squad[0].id).toBe('eurasian-bittern')
    expect(squad).toHaveLength(6)
    expect(squad.slice(1).map((f) => f.id)).not.toContain('eurasian-bittern')
    // the five chosen out-fit the two that were left out
    const total = (id: string) => cards.reduce((t, c) => t + fitOf(id, c), 0)
    const chosen = squad.slice(1).map((f) => f.id)
    const left = reported.filter((id) => id !== 'eurasian-bittern' && !chosen.includes(id))
    expect(left).toHaveLength(2)
    for (const id of left) for (const c of chosen) expect(total(c)).toBeGreaterThanOrEqual(total(id))
  })

  it('home ground: affinity 1 on every card, the boss 2; no bond point', () => {
    const squad = wardenSquad('eurasian-bittern', siteOf(['mute-swan']), cards)
    expect(squad[0].affinity(cards[0])).toBe(2)
    expect(squad[1].affinity(cards[0])).toBe(1)
    expect(squad.every((f) => f.bond === 0)).toBe(true)
  })

  it('fewer reported birds means a smaller squad; unknown birds are ignored', () => {
    expect(wardenSquad('eurasian-bittern', siteOf(['mute-swan', 'x-whatever']), cards).map((f) => f.id)).toEqual(['eurasian-bittern', 'mute-swan'])
    expect(wardenSquad('eurasian-bittern', siteOf([]), cards)).toHaveLength(1)
  })
})

describe('warden choice and rounds (E1)', () => {
  const swan = fighter('mute-swan') // huge, dex 4
  const wren = fighter('eurasian-wren') // tiny, dex 75
  const robin = fighter('european-robin') // small, dex 77
  const boss = fighter('eurasian-bittern', 2)
  const cards = [flatCard, flatCard, flatCard, flatCard, flatCard]
  const mine = () => ['mallard', 'common-snipe', 'great-cormorant', 'common-kingfisher', 'eurasian-teal'].map((id) => fighter(id))
  const duelOf = (opp: Fighter[]) => buildDuel(cards, mine(), opp, 'eurasian-bittern')
  const done = (round: number, opponentId: string, winner: RoundResult['winner']): RoundResult => ({
    round, card: flatCard, playerId: `p${round}`, opponentId, player: { fit: 1, affinity: 0, bond: 0, total: 1 }, opponent: { fit: 1, affinity: 0, bond: 0, total: 1 }, winner,
  })

  it('rounds are the smallest of five, the cards and both squads', () => {
    expect(duelOf([boss, swan, wren, robin]).rounds).toBe(4) // their squad is the smallest
    expect(buildDuel(cards, mine().slice(0, 3), [boss, swan, wren, robin], 'eurasian-bittern').rounds).toBe(3) // so is yours here
    expect(buildDuel(cards, [1, 2, 3, 4, 5, 6].map((i) => fighter(`b${i}`)), [boss, swan, wren, robin, fighter('mallard'), fighter('common-snipe')], 'eurasian-bittern').rounds).toBe(5)
  })

  it('ties on score go to the bigger bird, then the lower Dex number', () => {
    const d = duelOf([wren, robin, swan, fighter('eurasian-blue-tit')])
    expect(chooseOpponent(d, []).id).toBe('mute-swan') // all equal: huge beats the rest
    // robin (small) beats the tiny wren and blue tit
    expect(chooseOpponent(duelOf([wren, robin, fighter('eurasian-blue-tit')]), []).id).toBe('european-robin')
    // wren (dex 75) and blue tit (dex 61) are both tiny: lower dex number wins
    expect(chooseOpponent(duelOf([wren, fighter('eurasian-blue-tit')]), []).id).toBe('eurasian-blue-tit')
  })

  it('picks the unused bird with the best score for the card', () => {
    const strong = fighter('european-robin', 2)
    expect(chooseOpponent(duelOf([swan, strong, wren]), []).id).toBe('european-robin')
    // once used, the next best is chosen
    expect(chooseOpponent(duelOf([swan, strong, wren]), [done(1, 'european-robin', 'tie')]).id).toBe('mute-swan')
  })

  it('holds the boss back, even though he scores highest', () => {
    const d = duelOf([boss, swan, wren, robin, fighter('mallard')])
    for (let round = 0; round < 4; round++) {
      const used = ['mute-swan', 'european-robin', 'eurasian-wren', 'mallard'].slice(0, round)
      const results = used.map((id, i) => done(i + 1, id, 'tie'))
      expect(chooseOpponent(d, results).id).not.toBe('eurasian-bittern')
    }
  })

  it('plays the boss in the last round', () => {
    const d = duelOf([boss, swan, wren, robin, fighter('mallard')])
    const results = ['mute-swan', 'european-robin', 'eurasian-wren', 'mallard'].map((id, i) => done(i + 1, id, 'tie'))
    expect(chooseOpponent(d, results).id).toBe('eurasian-bittern')
  })

  it('brings the boss out early when you lead by two or more after round 3', () => {
    const d = duelOf([boss, swan, wren, robin, fighter('mallard')])
    const results = [done(1, 'mute-swan', 'player'), done(2, 'european-robin', 'player'), done(3, 'eurasian-wren', 'tie')]
    expect(chooseOpponent(d, results).id).toBe('eurasian-bittern')
    // only one round up: he stays back
    const close = [done(1, 'mute-swan', 'player'), done(2, 'european-robin', 'tie'), done(3, 'eurasian-wren', 'tie')]
    expect(chooseOpponent(d, close).id).not.toBe('eurasian-bittern')
    // before round 3 is finished the rule does not apply
    expect(chooseOpponent(d, [done(1, 'mute-swan', 'player'), done(2, 'european-robin', 'player')]).id).not.toBe('eurasian-bittern')
  })

  it('plays the boss when he is all that is left', () => {
    const d = buildDuel([flatCard, flatCard], [fighter('mallard'), fighter('common-snipe')], [boss, swan], 'eurasian-bittern')
    expect(chooseOpponent(d, [done(1, 'mute-swan', 'tie')]).id).toBe('eurasian-bittern')
  })

  it('a round is won by the higher score; equal scores are shared', () => {
    const d = buildDuel([flatCard], [fighter('mallard', 2), fighter('common-snipe', 0)], [fighter('mute-swan', 1)], null)
    expect(playRound(d, [], 'mallard').winner).toBe('player') // 3 v 2
    expect(playRound(d, [], 'common-snipe').winner).toBe('opponent') // 1 v 2
    const tie = buildDuel([flatCard], [fighter('mallard', 1)], [fighter('mute-swan', 1)], null)
    expect(playRound(tie, [], 'mallard').winner).toBe('tie')
  })

  it('refuses a bird you do not have, a bird used twice, or a round after the end', () => {
    const d = duelOf([boss, swan, wren, robin])
    expect(() => playRound(d, [], 'european-robin')).toThrow(/not in your squad/)
    const r1 = playRound(d, [], 'mallard')
    expect(() => playRound(d, [r1], 'mallard')).toThrow(/already played/)
    const all = [r1]
    for (const id of ['common-snipe', 'great-cormorant', 'common-kingfisher']) all.push(playRound(d, all, id))
    expect(all).toHaveLength(d.rounds)
    expect(() => playRound(d, all, 'eurasian-teal')).toThrow(/over/)
  })

  it('outcome: win, lose or draw only once every round is played', () => {
    const d = buildDuel([flatCard, flatCard, flatCard], [fighter('mallard'), fighter('common-snipe'), fighter('great-cormorant')], [swan, wren, robin], null)
    const r = (w: RoundResult['winner'], i: number) => done(i, 'x', w)
    expect(outcome(d, [r('player', 1)])).toMatchObject({ done: false, result: null, playerWins: 1 })
    expect(outcome(d, [r('player', 1), r('player', 2), r('opponent', 3)]).result).toBe('win')
    expect(outcome(d, [r('opponent', 1), r('opponent', 2), r('tie', 3)]).result).toBe('lose')
    expect(outcome(d, [r('player', 1), r('opponent', 2), r('tie', 3)]).result).toBe('draw')
    expect(tally([r('player', 1), r('tie', 2)])).toEqual({ playerWins: 1, opponentWins: 0, ties: 1 })
  })
})

describe('a whole warden duel (E1)', () => {
  const squadIds = ['european-robin', 'eurasian-wren', 'eurasian-blue-tit', 'mallard', 'common-snipe', 'mute-swan']
  const encounters = squadIds.flatMap((id, i) => many(3 + i * 10, { speciesId: id }))
  const bond = computeBond(encounters)
  const site = siteOf(['mute-swan', 'common-snipe', 'common-kingfisher', 'mallard', 'great-cormorant', 'eurasian-bittern', 'european-robin'])
  const setup = (over = {}) => setupWardenDuel({
    warden: { id: 'maud', siteId: 'L100001', boss: 'eurasian-bittern' }, site, squad: squadIds, encounters, bond, siteChars: chars,
    date: '2026-11-08', time: '07:00', ...over,
  })

  it('plays through to a result with every bird used once', () => {
    const d = setup()!
    expect(d).not.toBeNull()
    expect(d.rounds).toBe(5)
    const results: RoundResult[] = []
    while (!outcome(d, results).done) results.push(playRound(d, results, bestPlayerPick(d, results)))
    expect(results).toHaveLength(5)
    expect(new Set(results.map((r) => r.playerId)).size).toBe(5)
    expect(new Set(results.map((r) => r.opponentId)).size).toBe(5)
    expect(results.map((r) => r.card.id)).toEqual(d.cards.map((c) => c.id))
    // the boss is held back until round 5 unless the warden is trailing by two or more after round 3
    const t3 = tally(results.slice(0, 3))
    const bossRound = results.findIndex((r) => r.opponentId === 'eurasian-bittern')
    if (bossRound !== -1 && bossRound < 4) expect(bossRound >= 3 && t3.playerWins - t3.opponentWins >= 2).toBe(true)
    expect(['win', 'lose', 'draw']).toContain(outcome(d, results).result)
    for (const r of results) {
      expect(r.player.total).toBeLessThanOrEqual(6)
      expect(r.opponent.total).toBeLessThanOrEqual(6)
    }
  })

  it('is the same duel when played again the same day, and different on another day', () => {
    const a = setup()!.cards.map((c) => c.id)
    expect(setup()!.cards.map((c) => c.id)).toEqual(a)
    const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'].map((date) => setup({ date })!.cards.map((c) => c.id).join())
    expect(new Set([a.join(), ...days]).size).toBeGreaterThan(1)
  })

  it('needs at least three recorded birds in the squad', () => {
    const few = encounters.filter((e) => ['european-robin', 'eurasian-wren'].includes(e.speciesId))
    expect(setup({ encounters: few, bond: computeBond(few), squad: squadIds })).toBeNull()
    const three = encounters.filter((e) => ['european-robin', 'eurasian-wren', 'mallard'].includes(e.speciesId))
    expect(setup({ encounters: three, bond: computeBond(three), squad: squadIds })).not.toBeNull()
  })
})

describe('squads (E1)', () => {
  const encs = [...many(5, { speciesId: 'european-robin' }), ...many(30, { speciesId: 'mallard' }), ...many(12, { speciesId: 'common-snipe' }), ...many(2, { speciesId: 'x-regulus-ignicapilla' })]
  const bond = computeBond(encs)

  it('the default squad is the Dex birds with the most Bond, never outside-Dex birds, at most six', () => {
    const squad = defaultSquad(bond)
    expect(squad).not.toContain('x-regulus-ignicapilla')
    expect(squad[0]).toBe('mallard')
    expect(squad.length).toBeLessThanOrEqual(6)
    const sevenBirds = ['mute-swan', 'gadwall', 'eurasian-teal', 'eurasian-coot', 'common-moorhen', 'canada-goose', 'tufted-duck']
    expect(defaultSquad(computeBond(sevenBirds.flatMap((id) => many(2, { speciesId: id })))).length).toBe(6)
  })

  it('your chosen squad keeps only recorded Dex birds, no repeats, at most six; falls back to the default', () => {
    expect(resolveSquad(['mallard', 'mallard', 'mute-swan', 'x-regulus-ignicapilla', 'european-robin'], bond)).toEqual(['mallard', 'european-robin'])
    expect(resolveSquad([], bond)).toEqual(defaultSquad(bond))
    expect(resolveSquad(['mute-swan'], bond)).toEqual(defaultSquad(bond))
  })
})
