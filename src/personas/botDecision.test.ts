import { describe, expect, it } from 'vitest'
import { createDeck, shuffleDeck } from '../engine/deck'
import { createHand } from '../engine/bettingEngine'
import { PERSONAS, getPersona } from './personas'
import { decideBotAction } from './botDecision'
import type { BlindsConfig, Player } from '../types/poker'
import { POSITIONS } from '../types/poker'

const BLINDS: BlindsConfig = { smallBlind: 50, bigBlind: 100 }

function makePlayers(): Player[] {
  return POSITIONS.map((position, seat) => ({
    id: `p${seat}`,
    kind: seat === 0 ? 'human' : 'bot',
    name: `Player ${seat}`,
    position,
    stack: 10000,
    seat,
    personaId: seat === 0 ? undefined : PERSONAS[(seat - 1) % PERSONAS.length].id,
    isFolded: false,
    isAllIn: false,
  }))
}

function freshHand(seed = 0.42) {
  const deck = shuffleDeck(createDeck(), () => seed)
  return createHand('hand-1', makePlayers(), 6, BLINDS, deck)
}

describe('decideBotAction — preflop', () => {
  it('always returns a legal action for the player to act', () => {
    // Seat 1 (UTG1) is a bot; force it to act first regardless of the
    // hand's actual toActPlayerId, since only bots have a persona.
    const hand = { ...freshHand(), toActPlayerId: 'p1' }
    const player = hand.players.find((p) => p.id === 'p1')!
    const persona = getPersona(player.personaId!)!
    // Run many seeds to exercise different branches without ever going illegal.
    for (let i = 0; i < 25; i++) {
      const decision = decideBotAction(hand, 'p1', persona, () => i / 25)
      expect(['fold', 'check', 'call', 'bet', 'raise', 'all-in']).toContain(decision.action.type)
      expect(decision.thinkTimeMs).toBeGreaterThanOrEqual(0)
    }
  })

  it('opens a premium pair from the button when first in', () => {
    const hand = freshHand()
    // currentBet === bigBlind here (freshHand's initial state) => BTN is
    // deciding whether to open, regardless of who's still to act behind.
    const btn = hand.players[6]
    btn.holeCards = [
      { rank: 'A', suit: 's' },
      { rank: 'A', suit: 'h' },
    ]
    const persona = getPersona(btn.personaId!)!
    const decision = decideBotAction({ ...hand, toActPlayerId: btn.id }, btn.id, persona, () => 0.5)
    expect(decision.action.type).toBe('raise')
  })

  it('folds a trash hand facing a 3-bet-sized raise', () => {
    let hand = freshHand()
    hand = { ...hand, currentBet: 500, toActPlayerId: 'p0' }
    hand.players[0].holeCards = [
      { rank: '7', suit: 'c' },
      { rank: '2', suit: 'd' },
    ]
    const persona = getPersona('the-rock')!
    const decision = decideBotAction(hand, 'p0', persona, () => 0.99)
    expect(decision.action.type).toBe('fold')
  })
})

describe('decideBotAction — postflop', () => {
  it('checks back with a weak hand when a bluff roll misses', () => {
    let hand = freshHand()
    hand = {
      ...hand,
      street: 'flop',
      board: [
        { rank: '2', suit: 'h' },
        { rank: '9', suit: 'd' },
        { rank: 'J', suit: 'c' },
      ],
      currentBet: 0,
      streetContributions: Object.fromEntries(hand.players.map((p) => [p.id, 0])),
      toActPlayerId: 'p0',
    }
    hand.players[0].holeCards = [
      { rank: '4', suit: 's' },
      { rank: '5', suit: 'h' },
    ]
    const persona = getPersona('the-rock')!
    const decision = decideBotAction(hand, 'p0', persona, () => 0.99) // never bluffs
    expect(decision.action.type).toBe('check')
  })

  it('bets a strong made hand when the value-bet roll hits', () => {
    let hand = freshHand()
    hand = {
      ...hand,
      street: 'flop',
      board: [
        { rank: 'A', suit: 'h' },
        { rank: 'A', suit: 'd' },
        { rank: 'J', suit: 'c' },
      ],
      currentBet: 0,
      streetContributions: Object.fromEntries(hand.players.map((p) => [p.id, 0])),
      toActPlayerId: 'p0',
    }
    hand.players[0].holeCards = [
      { rank: 'A', suit: 's' },
      { rank: 'K', suit: 'h' },
    ]
    const persona = getPersona('solid-reg')!
    const decision = decideBotAction(hand, 'p0', persona, () => 0) // always hits probability rolls
    expect(decision.action.type).toBe('bet')
  })
})
