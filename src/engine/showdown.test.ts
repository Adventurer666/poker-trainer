import { describe, expect, it } from 'vitest'
import { cardFromString } from '../types/card'
import { resolveShowdown } from './showdown'
import type { HandState, Player } from '../types/poker'

function makePlayer(overrides: Partial<Player> & { id: string; seat: number }): Player {
  return {
    kind: 'bot',
    name: overrides.id,
    position: 'BTN',
    stack: 0,
    isFolded: false,
    isAllIn: false,
    ...overrides,
  }
}

function baseHand(players: Player[], totalContributions: Record<string, number>): HandState {
  return {
    handId: 'h1',
    street: 'showdown',
    board: [
      cardFromString('2h'),
      cardFromString('7c'),
      cardFromString('9d'),
      cardFromString('4h'),
      cardFromString('Jd'),
    ],
    pot: Object.values(totalContributions).reduce((a, b) => a + b, 0),
    players,
    actionHistory: [],
    buttonSeat: 0,
    toActPlayerId: null,
    blinds: { smallBlind: 50, bigBlind: 100 },
    deck: [],
    currentBet: 0,
    minRaiseAmount: 100,
    streetContributions: {},
    totalContributions,
    actedThisStreet: [],
    isHandComplete: false,
    results: [],
  }
}

describe('resolveShowdown', () => {
  it('awards the whole pot to the single best hand', () => {
    const players = [
      makePlayer({ id: 'a', seat: 0, stack: 0, holeCards: [cardFromString('As'), cardFromString('Ah')] }),
      makePlayer({ id: 'b', seat: 1, stack: 0, holeCards: [cardFromString('Ks'), cardFromString('Kh')] }),
    ]
    const hand = baseHand(players, { a: 200, b: 200 })
    const results = resolveShowdown(hand)
    expect(results).toEqual([{ playerId: 'a', amountWon: 400, wonUncontested: false }])
    expect(players[0].stack).toBe(400)
  })

  it('splits the pot on a tie', () => {
    const board = [
      cardFromString('Ah'),
      cardFromString('Kh'),
      cardFromString('Qh'),
      cardFromString('Jh'),
      cardFromString('Th'),
    ]
    const players = [
      makePlayer({ id: 'a', seat: 0, holeCards: [cardFromString('2s'), cardFromString('3c')] }),
      makePlayer({ id: 'b', seat: 1, holeCards: [cardFromString('4d'), cardFromString('5c')] }),
    ]
    const hand = { ...baseHand(players, { a: 200, b: 200 }), board }
    const results = resolveShowdown(hand)
    expect(results.map((r) => r.amountWon).sort()).toEqual([200, 200])
    expect(players[0].stack).toBe(200)
    expect(players[1].stack).toBe(200)
  })

  it('pays a side pot separately from the main pot for an uneven all-in', () => {
    // a is all-in for 100 with the best hand; b and c each put in 300.
    // a can only win the 300 main pot (100*3); b/c fight for the 400 side pot.
    const players = [
      makePlayer({ id: 'a', seat: 0, holeCards: [cardFromString('As'), cardFromString('Ah')] }),
      makePlayer({ id: 'b', seat: 1, holeCards: [cardFromString('Ks'), cardFromString('Kh')] }),
      makePlayer({ id: 'c', seat: 2, holeCards: [cardFromString('2s'), cardFromString('3c')] }),
    ]
    const hand = baseHand(players, { a: 100, b: 300, c: 300 })
    const results = resolveShowdown(hand)
    const byPlayer = Object.fromEntries(results.map((r) => [r.playerId, r.amountWon]))
    expect(byPlayer.a).toBe(300) // main pot: 100 * 3
    expect(byPlayer.b).toBe(400) // side pot: 200 * 2, b has the better hand of b/c
    expect(byPlayer.c).toBeUndefined()
  })

  it('excludes a folded contributor from winning but keeps their chips in the pot', () => {
    const players = [
      makePlayer({ id: 'a', seat: 0, isFolded: true, holeCards: [cardFromString('As'), cardFromString('Ah')] }),
      makePlayer({ id: 'b', seat: 1, holeCards: [cardFromString('2s'), cardFromString('3c')] }),
    ]
    const hand = baseHand(players, { a: 200, b: 200 })
    const results = resolveShowdown(hand)
    expect(results).toEqual([{ playerId: 'b', amountWon: 400, wonUncontested: false }])
  })
})
