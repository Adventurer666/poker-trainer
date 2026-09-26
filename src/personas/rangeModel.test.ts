import { describe, expect, it } from 'vitest'
import { createDeck, shuffleDeck } from '../engine/deck'
import { createHand } from '../engine/bettingEngine'
import { getPersona } from './personas'
import {
  classifyPreflopAction,
  continueRangePercent,
  groundTruthRangeForPlayer,
  openRangePercent,
  threeBetRangePercent,
} from './rangeModel'
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
    isFolded: false,
    isAllIn: false,
  }))
}

function freshHand() {
  const deck = shuffleDeck(createDeck(), () => 0.42)
  return createHand('hand-1', makePlayers(), 6, BLINDS, deck)
}

describe('range percent helpers', () => {
  const persona = getPersona('solid-reg')!

  it('continue range is narrower than the open range', () => {
    expect(continueRangePercent(persona, 'BTN')).toBeLessThan(openRangePercent(persona, 'BTN'))
  })

  it('three-bet range is narrower than the open range', () => {
    expect(threeBetRangePercent(persona, 'BTN')).toBeLessThan(openRangePercent(persona, 'BTN'))
  })
})

describe('classifyPreflopAction', () => {
  it('classifies a first-in raise as "open"', () => {
    let hand = freshHand()
    hand = { ...hand, toActPlayerId: 'p0' }
    // Manually record what would be p0's action history without running the
    // full engine, since we're only testing the classifier here.
    hand.actionHistory = [{ playerId: 'p0', street: 'preflop', type: 'raise', amount: 300, thinkTimeMs: 0 }]
    expect(classifyPreflopAction(hand, 'p0')).toBe('open')
  })

  it('classifies a raise facing an existing raise as "three-bet"', () => {
    let hand = freshHand()
    hand.actionHistory = [
      { playerId: 'p0', street: 'preflop', type: 'raise', amount: 300, thinkTimeMs: 0 },
      { playerId: 'p1', street: 'preflop', type: 'raise', amount: 900, thinkTimeMs: 0 },
    ]
    expect(classifyPreflopAction(hand, 'p1')).toBe('three-bet')
  })

  it('classifies a call facing a raise as "continue"', () => {
    let hand = freshHand()
    hand.actionHistory = [
      { playerId: 'p0', street: 'preflop', type: 'raise', amount: 300, thinkTimeMs: 0 },
      { playerId: 'p1', street: 'preflop', type: 'call', amount: 300, thinkTimeMs: 0 },
    ]
    expect(classifyPreflopAction(hand, 'p1')).toBe('continue')
  })

  it('classifies a fold as "folded"', () => {
    let hand = freshHand()
    hand.actionHistory = [{ playerId: 'p1', street: 'preflop', type: 'fold', amount: 0, thinkTimeMs: 0 }]
    expect(classifyPreflopAction(hand, 'p1')).toBe('folded')
  })

  it('classifies no action at all as "folded" (nothing to compare)', () => {
    const hand = freshHand()
    expect(classifyPreflopAction(hand, 'p5')).toBe('folded')
  })
})

describe('groundTruthRangeForPlayer', () => {
  it('returns an empty set for a folded player', () => {
    let hand = freshHand()
    hand.actionHistory = [{ playerId: 'p1', street: 'preflop', type: 'fold', amount: 0, thinkTimeMs: 0 }]
    const persona = getPersona('the-rock')!
    expect(groundTruthRangeForPlayer(hand, 'p1', persona).size).toBe(0)
  })

  it('returns a non-empty range for a player who opened', () => {
    let hand = freshHand()
    hand.actionHistory = [{ playerId: 'p1', street: 'preflop', type: 'raise', amount: 300, thinkTimeMs: 0 }]
    const persona = getPersona('solid-reg')!
    expect(groundTruthRangeForPlayer(hand, 'p1', persona).size).toBeGreaterThan(0)
  })
})
