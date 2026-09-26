import { RANKS, SUITS, type Card } from '../types/card'

/** A fresh, ordered 52-card deck. */
export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

/**
 * Fisher-Yates shuffle. Returns a new array; does not mutate the input.
 * Accepts an injectable RNG so tests/replays can be deterministic.
 */
export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
  const result = [...deck]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function dealCards(deck: Card[], count: number): { dealt: Card[]; remaining: Card[] } {
  if (count > deck.length) {
    throw new Error(`Cannot deal ${count} cards from a deck of ${deck.length}`)
  }
  return { dealt: deck.slice(0, count), remaining: deck.slice(count) }
}
