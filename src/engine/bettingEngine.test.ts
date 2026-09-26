import { describe, expect, it } from 'vitest'
import { createDeck, shuffleDeck } from './deck'
import { applyAction, createHand, legalActions } from './bettingEngine'
import type { BlindsConfig, HandState, Player } from '../types/poker'
import { POSITIONS } from '../types/poker'

const BLINDS: BlindsConfig = { smallBlind: 50, bigBlind: 100 }

function makePlayers(stacks: number[] = new Array(9).fill(10000)): Player[] {
  return POSITIONS.map((position, seat) => ({
    id: `p${seat}`,
    kind: seat === 0 ? 'human' : 'bot',
    name: `Player ${seat}`,
    position,
    stack: stacks[seat],
    seat,
    isFolded: false,
    isAllIn: false,
  }))
}

function freshHand(buttonSeat = 6, stacks?: number[]): HandState {
  const deck = shuffleDeck(createDeck(), () => 0.42) // deterministic for tests
  return createHand('hand-1', makePlayers(stacks), buttonSeat, BLINDS, deck)
}

describe('createHand', () => {
  it('deals two hole cards to every player', () => {
    const hand = freshHand()
    for (const p of hand.players) {
      expect(p.holeCards).toHaveLength(2)
    }
  })

  it('posts blinds from the correct seats', () => {
    const hand = freshHand(6) // BTN=seat6 -> SB=seat7, BB=seat8
    expect(hand.streetContributions['p7']).toBe(50)
    expect(hand.streetContributions['p8']).toBe(100)
    expect(hand.pot).toBe(150)
    expect(hand.players[7].stack).toBe(9950)
    expect(hand.players[8].stack).toBe(9900)
  })

  it('sets UTG to act first', () => {
    const hand = freshHand(6) // UTG = seat0
    expect(hand.toActPlayerId).toBe('p0')
  })

  it('sets currentBet to the big blind', () => {
    const hand = freshHand()
    expect(hand.currentBet).toBe(100)
  })
})

describe('legalActions', () => {
  it('offers fold/call/raise to UTG facing just the blinds', () => {
    const hand = freshHand()
    const legal = legalActions(hand, 'p0')
    expect(legal.types).toEqual(expect.arrayContaining(['fold', 'call', 'raise', 'all-in']))
    expect(legal.callAmount).toBe(100)
  })

  it('offers check to a player already matching currentBet with no raise pending', () => {
    const hand = freshHand()
    // Player 0..7 fold, leaving BB (p8) with the option and no one to call.
    let h = hand
    for (let seat = 0; seat < 8; seat++) {
      h = applyAction(h, `p${seat}`, { type: 'fold' })
    }
    const legal = legalActions(h, 'p8')
    expect(legal.types).toContain('check')
    expect(legal.callAmount).toBe(0)
  })
})

describe('applyAction — folding around', () => {
  it('awards the pot uncontested when everyone else folds', () => {
    let hand = freshHand()
    for (let seat = 0; seat < 8; seat++) {
      hand = applyAction(hand, `p${seat}`, { type: 'fold' })
    }
    // Only BB (p8) remains — the hand ends immediately, no option needed.
    expect(hand.isHandComplete).toBe(true)
    expect(hand.results[0].playerId).toBe('p8')
    expect(hand.results[0].wonUncontested).toBe(true)
  })

  it('ends the hand immediately if a fold leaves only one player', () => {
    let hand = freshHand()
    // Raise it up then get everyone else to fold except one caller.
    hand = applyAction(hand, 'p0', { type: 'raise', amount: 300 })
    for (let seat = 1; seat < 8; seat++) {
      hand = applyAction(hand, `p${seat}`, { type: 'fold' })
    }
    // Only p0 (raiser) and p8 (BB) remain; p8 folds -> p0 wins uncontested.
    hand = applyAction(hand, 'p8', { type: 'fold' })
    expect(hand.isHandComplete).toBe(true)
    expect(hand.results[0].playerId).toBe('p0')
  })
})

describe('applyAction — full street progression', () => {
  it('advances from preflop to flop once everyone calls/checks', () => {
    let hand = freshHand()
    for (let seat = 0; seat < 8; seat++) {
      hand = applyAction(hand, `p${seat}`, { type: 'call' })
    }
    expect(hand.street).toBe('preflop') // BB still has the option
    hand = applyAction(hand, 'p8', { type: 'check' })
    expect(hand.street).toBe('flop')
    expect(hand.board).toHaveLength(3)
    expect(hand.currentBet).toBe(0)
  })

  it('resets streetContributions on the new street', () => {
    let hand = freshHand()
    for (let seat = 0; seat < 8; seat++) {
      hand = applyAction(hand, `p${seat}`, { type: 'call' })
    }
    hand = applyAction(hand, 'p8', { type: 'check' })
    for (const p of hand.players) {
      expect(hand.streetContributions[p.id]).toBe(0)
    }
  })
})

describe('applyAction — all-in runout', () => {
  it('deals straight to showdown once only one non-all-in player remains', () => {
    // p0 shoves a tiny stack; everyone else folds except BB, who calls with
    // plenty behind — p0 is all-in and p8 has no one left to bet against.
    const stacks = new Array(9).fill(10000)
    stacks[0] = 200
    let hand = freshHand(6, stacks)
    hand = applyAction(hand, 'p0', { type: 'all-in' })
    for (let seat = 1; seat < 8; seat++) {
      hand = applyAction(hand, `p${seat}`, { type: 'fold' })
    }
    hand = applyAction(hand, 'p8', { type: 'call' })
    expect(hand.street).toBe('showdown')
    expect(hand.board).toHaveLength(5)
    expect(hand.isHandComplete).toBe(true)
  })
})

describe('applyAction — raises', () => {
  it('reopens action for players who already acted', () => {
    let hand = freshHand()
    hand = applyAction(hand, 'p0', { type: 'call' }) // limps
    hand = applyAction(hand, 'p1', { type: 'raise', amount: 400 })
    // p0 already acted (called) but must act again after the raise.
    const legal = legalActions(hand, 'p0')
    expect(legal.types).toContain('call')
    expect(legal.callAmount).toBe(300) // 400 - 100 already in
  })

  it('rejects a raise below the minimum', () => {
    const hand = freshHand()
    expect(() => applyAction(hand, 'p0', { type: 'raise', amount: 120 })).toThrow()
  })

  it('rejects acting out of turn', () => {
    const hand = freshHand()
    expect(() => applyAction(hand, 'p1', { type: 'fold' })).toThrow()
  })
})
