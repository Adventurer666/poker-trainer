import { describe, expect, it } from 'vitest'
import { cardToString } from '../types/card'
import { createDeck, dealCards, shuffleDeck } from './deck'

describe('createDeck', () => {
  it('has 52 unique cards', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    const unique = new Set(deck.map(cardToString))
    expect(unique.size).toBe(52)
  })
})

describe('shuffleDeck', () => {
  it('preserves the same set of cards', () => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck)
    expect(shuffled).toHaveLength(52)
    expect(new Set(shuffled.map(cardToString))).toEqual(new Set(deck.map(cardToString)))
  })

  it('does not mutate the input deck', () => {
    const deck = createDeck()
    const before = deck.map(cardToString)
    shuffleDeck(deck)
    expect(deck.map(cardToString)).toEqual(before)
  })

  it('is deterministic given a fixed rng', () => {
    const deck = createDeck()
    const rng = () => 0.5
    const a = shuffleDeck(deck, rng)
    const b = shuffleDeck(deck, rng)
    expect(a.map(cardToString)).toEqual(b.map(cardToString))
  })
})

describe('dealCards', () => {
  it('splits dealt and remaining without overlap', () => {
    const deck = createDeck()
    const { dealt, remaining } = dealCards(deck, 9 * 2)
    expect(dealt).toHaveLength(18)
    expect(remaining).toHaveLength(34)
  })

  it('throws when dealing more cards than remain', () => {
    const deck = createDeck()
    expect(() => dealCards(deck, 53)).toThrow()
  })
})
