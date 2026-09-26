import { describe, expect, it } from 'vitest'
import { cardFromString } from '../types/card'
import { getPersona } from './personas'
import { believedRangeForOpponent } from './rangeNarrowing'
import { openRange } from './rangeModel'
import type { HandState, Player, PlayerAction } from '../types/poker'

function makePlayer(overrides: Partial<Player> & { id: string; seat: number }): Player {
  return {
    kind: 'bot',
    name: overrides.id,
    position: 'BTN',
    stack: 10000,
    isFolded: false,
    isAllIn: false,
    ...overrides,
  }
}

function action(playerId: string, street: PlayerAction['street'], type: PlayerAction['type'], amount = 0): PlayerAction {
  return { playerId, street, type, amount, thinkTimeMs: 0 }
}

function baseHand(players: Player[], actionHistory: PlayerAction[], board: ReturnType<typeof cardFromString>[]): HandState {
  return {
    handId: 'h1',
    street: 'river',
    board,
    pot: 1000,
    players,
    actionHistory,
    buttonSeat: 0,
    toActPlayerId: null,
    blinds: { smallBlind: 50, bigBlind: 100 },
    deck: [],
    currentBet: 0,
    minRaiseAmount: 100,
    streetContributions: {},
    totalContributions: {},
    actedThisStreet: [],
    isHandComplete: false,
    results: [],
  }
}

describe('believedRangeForOpponent', () => {
  it('returns the flat preflop range when the player has taken no postflop action yet', () => {
    const villain = makePlayer({ id: 'v', seat: 1, position: 'BTN' })
    const persona = getPersona('solid-reg')!
    const hand = baseHand([villain], [action('v', 'preflop', 'raise', 300)], [])

    const believed = believedRangeForOpponent(hand, 'v', persona, [])
    expect(believed).toEqual(openRange(persona, 'BTN'))
  })

  it('returns an empty range for a player who folded preflop', () => {
    const villain = makePlayer({ id: 'v', seat: 1, position: 'UTG' })
    const persona = getPersona('solid-reg')!
    const hand = baseHand([villain], [action('v', 'preflop', 'fold')], [])

    expect(believedRangeForOpponent(hand, 'v', persona, [])).toEqual(new Set())
  })

  it('narrows toward a smaller, stronger range after a flop bet', () => {
    const villain = makePlayer({ id: 'v', seat: 1, position: 'BTN' })
    const persona = getPersona('solid-reg')!
    const board = [cardFromString('Ah'), cardFromString('7c'), cardFromString('2d')]
    const hand = baseHand(
      villain ? [villain] : [],
      [action('v', 'preflop', 'raise', 300), action('v', 'flop', 'bet', 400)],
      board,
    )

    const preflop = openRange(persona, 'BTN')
    const narrowed = believedRangeForOpponent(hand, 'v', persona, [])
    expect(narrowed.size).toBeLessThan(preflop.size)
    expect(narrowed.size).toBeGreaterThan(0)
  })

  it('trims only a small fraction after a flop call (a defender, not an aggressor)', () => {
    const villain = makePlayer({ id: 'v', seat: 1, position: 'BTN' })
    const persona = getPersona('solid-reg')!
    const board = [cardFromString('Ah'), cardFromString('7c'), cardFromString('2d')]
    const hand = baseHand([villain], [action('v', 'preflop', 'raise', 300), action('v', 'flop', 'call', 400)], board)

    const preflop = openRange(persona, 'BTN')
    const narrowed = believedRangeForOpponent(hand, 'v', persona, [])
    // A call trims the bottom ~15%, so it should stay close to (not far
    // below) the preflop range size — much less aggressive narrowing than a bet.
    expect(narrowed.size).toBeLessThan(preflop.size)
    expect(narrowed.size).toBeGreaterThan(preflop.size * 0.7)
  })

  it('leaves the range unchanged after a check (no new information)', () => {
    const villain = makePlayer({ id: 'v', seat: 1, position: 'BTN' })
    const persona = getPersona('solid-reg')!
    const board = [cardFromString('Ah'), cardFromString('7c'), cardFromString('2d')]
    const hand = baseHand([villain], [action('v', 'preflop', 'raise', 300), action('v', 'flop', 'check')], board)

    const preflop = openRange(persona, 'BTN')
    const narrowed = believedRangeForOpponent(hand, 'v', persona, [])
    expect(narrowed.size).toBe(preflop.size)
  })
})
