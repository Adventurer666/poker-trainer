import { RANKS, type Rank } from '../types/card'

/** All 169 canonical starting hand types, e.g. "AA", "AKs", "72o" (always high rank first). */
export function allStartingHands(): string[] {
  const ranksDesc = [...RANKS].reverse() // A, K, Q, ..., 2
  const hands: string[] = []
  for (let i = 0; i < ranksDesc.length; i++) {
    for (let j = i; j < ranksDesc.length; j++) {
      const high = ranksDesc[i]
      const low = ranksDesc[j]
      if (high === low) {
        hands.push(`${high}${low}`) // pair, e.g. "AA"
      } else {
        hands.push(`${high}${low}s`)
        hands.push(`${high}${low}o`)
      }
    }
  }
  return hands
}

function rankValue(rank: Rank): number {
  return RANKS.indexOf(rank) + 2 // '2' -> 2, ..., 'A' -> 14
}

function chenHighCardScore(rank: Rank): number {
  if (rank === 'A') return 10
  if (rank === 'K') return 8
  if (rank === 'Q') return 7
  if (rank === 'J') return 6
  return rankValue(rank) / 2 // T=5, 9=4.5, ..., 2=1
}

/**
 * Chen formula: a well-known, simple heuristic for ranking the 169 starting
 * hands by rough preflop strength. Used here to derive "top X%" opening
 * ranges for bot personas — a reasonable approximation, not solver output.
 */
export function chenScore(hand: string): number {
  const isPair = hand.length === 2
  const highRank = hand[0] as Rank
  const lowRank = hand[1] as Rank
  const suited = hand.endsWith('s')

  if (isPair) {
    const base = chenHighCardScore(highRank) * 2
    return Math.max(base, 5)
  }

  let score = chenHighCardScore(highRank)
  if (suited) score += 2

  const gap = rankValue(highRank) - rankValue(lowRank) - 1
  if (gap <= 0) score += 1 // connectors
  else if (gap === 1) score -= 1
  else if (gap === 2) score -= 2
  else if (gap === 3) score -= 4
  else score -= 5

  // Bonus for two cards below a Queen and one gap or less (per Chen's rule).
  if (gap <= 1 && rankValue(highRank) <= rankValue('Q') && !isPair) score += 1

  return Math.max(Math.round(score * 2) / 2, 0)
}

export interface RankedHand {
  hand: string
  score: number
}

/** All 169 hands, ranked strongest to weakest by Chen score. */
export function rankedHands(): RankedHand[] {
  return allStartingHands()
    .map((hand) => ({ hand, score: chenScore(hand) }))
    .sort((a, b) => b.score - a.score)
}

/**
 * The top `percent` of starting hands by rank, as a Set of hand notations.
 * e.g. topPercentRange(15) ~= a typical early-position opening range.
 */
export function topPercentRange(percent: number): Set<string> {
  const ranked = rankedHands()
  const count = Math.max(1, Math.round((percent / 100) * ranked.length))
  return new Set(ranked.slice(0, count).map((r) => r.hand))
}
