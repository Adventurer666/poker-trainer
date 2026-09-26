import { describe, it } from 'vitest'
import { applyAction, createHand } from '../engine/bettingEngine'
import { createDeck, shuffleDeck } from '../engine/deck'
import { decideBotAction } from '../personas/botDecision'
import { getPersona, PERSONAS } from '../personas/personas'
import { SKILL_LEVELS } from '../personas/skill'
import { POSITIONS, type BlindsConfig, type HandState, type Player } from '../types/poker'

const BLINDS: BlindsConfig = { smallBlind: 50, bigBlind: 100 }
// Read without relying on Node types (the app tsconfig doesn't include them).
const CAL_HANDS = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.CAL_HANDS
const HANDS = Number(CAL_HANDS ?? 1500)

interface Stat {
  dealt: number
  vpip: number
  pfr: number
  foldUnraised: number
  facedRaise: number
  foldToRaise: number
  sawFlop: number
  facedPostflopBet: number
  foldPostflopBet: number
  showdown: number
}
const blank = (): Stat => ({
  dealt: 0, vpip: 0, pfr: 0, foldUnraised: 0, facedRaise: 0, foldToRaise: 0,
  sawFlop: 0, facedPostflopBet: 0, foldPostflopBet: 0, showdown: 0,
})

function seatPlayers(): Player[] {
  return POSITIONS.map((position, seat) => ({
    id: `b${seat}`,
    kind: 'bot' as const,
    name: `B${seat}`,
    position,
    stack: 10000,
    seat,
    personaId: PERSONAS[Math.floor(Math.random() * PERSONAS.length)].id,
    skillLevel: SKILL_LEVELS[Math.floor(Math.random() * 3)],
    isFolded: false,
    isAllIn: false,
  }))
}

// Diagnostic only — run with: CAL_HANDS=1500 npx vitest run src/dev/calibration.test.ts --reporter=verbose
describe.skipIf(!CAL_HANDS)('calibration (diagnostic, prints only)', () => {
  it('measures persona behavior over many simulated hands', { timeout: 600_000 }, () => {
    const byPersona: Record<string, Stat> = {}
    let walks = 0
    let handsReachingFlop = 0
    let totalHands = 0

    for (let h = 0; h < HANDS; h++) {
      let hand: HandState = createHand(`h${h}`, seatPlayers(), h % 9, BLINDS, shuffleDeck(createDeck()))
      const vpipd = new Set<string>()
      const pfrd = new Set<string>()
      totalHands++
      for (const p of hand.players) {
        byPersona[p.personaId!] ??= blank()
        byPersona[p.personaId!].dealt++
      }

      let guard = 0
      while (!hand.isHandComplete && hand.toActPlayerId && guard++ < 500) {
        const actor = hand.players.find((p) => p.id === hand.toActPlayerId)!
        const persona = getPersona(actor.personaId!)!
        const st = byPersona[persona.id]
        const facingBet = hand.currentBet > (hand.streetContributions[actor.id] ?? 0)
        const raisedPreflop = hand.street === 'preflop' && hand.currentBet > BLINDS.bigBlind

        const { action } = decideBotAction(hand, actor.id, persona)

        if (hand.street === 'preflop') {
          if (action.type === 'call' || action.type === 'raise' || action.type === 'bet' || action.type === 'all-in') vpipd.add(actor.id)
          if (action.type === 'raise' || action.type === 'bet' || action.type === 'all-in') pfrd.add(actor.id)
          if (raisedPreflop) {
            st.facedRaise++
            if (action.type === 'fold') st.foldToRaise++
          } else if (action.type === 'fold') {
            st.foldUnraised++
          }
        } else if (facingBet) {
          st.facedPostflopBet++
          if (action.type === 'fold') st.foldPostflopBet++
        }

        hand = applyAction(hand, actor.id, action)
      }

      for (const id of vpipd) byPersona[hand.players.find((p) => p.id === id)!.personaId!].vpip++
      for (const id of pfrd) byPersona[hand.players.find((p) => p.id === id)!.personaId!].pfr++

      const flopActions = hand.actionHistory.some((a) => a.street !== 'preflop')
      if (hand.board.length >= 3 && flopActions) handsReachingFlop++
      if (!flopActions && hand.results[0]?.wonUncontested && vpipd.size === 0) walks++
      if (hand.board.length >= 3) {
        for (const p of hand.players) if (!p.isFolded || hand.actionHistory.some((a) => a.playerId === p.id && a.street === 'flop')) {
          if (hand.actionHistory.some((a) => a.playerId === p.id && a.street !== 'preflop') || !p.isFolded) byPersona[p.personaId!].sawFlop++
        }
      }
      if (!hand.results[0]?.wonUncontested) {
        for (const p of hand.players) if (!p.isFolded) byPersona[p.personaId!].showdown++
      }
    }

    const pct = (n: number, d: number) => (d === 0 ? '  -  ' : `${((100 * n) / d).toFixed(0).padStart(3)}%`)
    console.log(`\n${totalHands} hands | walks (everyone folds to BB): ${pct(walks, totalHands)} | hands reaching flop: ${pct(handsReachingFlop, totalHands)}`)
    console.log('persona              VPIP(decl) PFR(decl) foldUnraised foldToRaise sawFlop foldToPostflopBet')
    for (const p of PERSONAS) {
      const s = byPersona[p.id]
      if (!s) continue
      console.log(
        `${p.displayName.padEnd(20)} ${pct(s.vpip, s.dealt)}(${String(p.tendencies.vpip).padStart(2)}) ${pct(s.pfr, s.dealt)}(${String(p.tendencies.pfr).padStart(2)})   ${pct(s.foldUnraised, s.dealt)}        ${pct(s.foldToRaise, s.facedRaise)}      ${pct(s.sawFlop, s.dealt)}   ${pct(s.foldPostflopBet, s.facedPostflopBet)}`,
      )
    }
  })
})
