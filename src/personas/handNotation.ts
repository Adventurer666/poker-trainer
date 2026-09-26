import { RANKS, type Card, type Rank } from '../types/card'

const RANK_ORDER: Record<Rank, number> = Object.fromEntries(
  RANKS.map((r, i) => [r, i]),
) as Record<Rank, number>

/** Converts 2 hole cards into their canonical starting-hand notation, e.g. "AKs", "72o", "TT". */
export function handNotation(holeCards: [Card, Card]): string {
  const [a, b] = holeCards
  const suited = a.suit === b.suit
  if (a.rank === b.rank) return `${a.rank}${b.rank}`

  const [high, low] =
    RANK_ORDER[a.rank] > RANK_ORDER[b.rank] ? [a.rank, b.rank] : [b.rank, a.rank]
  return `${high}${low}${suited ? 's' : 'o'}`
}
