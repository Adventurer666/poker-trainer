/** Core card primitives shared across the engine, personas, and UI. */

export const SUITS = ['s', 'h', 'd', 'c'] as const
export type Suit = (typeof SUITS)[number]

export const RANKS = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'T',
  'J',
  'Q',
  'K',
  'A',
] as const
export type Rank = (typeof RANKS)[number]

export interface Card {
  rank: Rank
  suit: Suit
}

/** "As", "Td", "9h" — the format pokersolver and most poker tooling expects. */
export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`
}

export function cardFromString(code: string): Card {
  const rank = code.slice(0, -1) as Rank
  const suit = code.slice(-1) as Suit
  return { rank, suit }
}
