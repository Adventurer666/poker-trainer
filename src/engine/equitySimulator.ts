import { flattenRangeToCombos } from '../personas/handCombos'
import { cardToString, type Card } from '../types/card'
import { createDeck } from './deck'
import { determineWinners, evaluateHand } from './handEvaluator'

const DEFAULT_TRIALS = 150

/**
 * Monte Carlo showdown equity for `heroHole` against a random hand sampled
 * from `opponentRange`, on the given (partial or complete) board. Replaces
 * a hand-strength lookup table with an actual equity number: for each
 * trial, deal the opponent a live combo from their range, deal out the
 * remaining board cards, and evaluate the real winner with pokersolver
 * (already a project dependency).
 *
 * This is intentionally single-opponent — see believedOpponentRange's
 * caller in botDecision.ts for how a multiway pot picks which opponent's
 * range to use. Returns 0.5 (no information) if the range has no live
 * combos left after card removal, rather than throwing.
 */
export function estimateEquityVsRange(
  heroHole: [Card, Card],
  board: Card[],
  opponentRange: Set<string>,
  options: { trials?: number; rng?: () => number } = {},
): number {
  const trials = options.trials ?? DEFAULT_TRIALS
  const rng = options.rng ?? Math.random

  const dead = [...heroHole, ...board]
  const comboPool = flattenRangeToCombos(opponentRange, dead)
  if (comboPool.length === 0) return 0.5

  let wins = 0
  let ties = 0

  for (let t = 0; t < trials; t++) {
    const oppHole = comboPool[Math.floor(rng() * comboPool.length)]
    const usedCodes = new Set([...dead, ...oppHole].map(cardToString))
    const remainingDeck = createDeck().filter((c) => !usedCodes.has(cardToString(c)))

    const neededCards = 5 - board.length
    const drawn = sampleWithoutReplacement(remainingDeck, neededCards, rng)
    const fullBoard = [...board, ...drawn]

    const heroHand = evaluateHand('hero', heroHole, fullBoard)
    const oppHand = evaluateHand('villain', oppHole, fullBoard)
    const winners = determineWinners([heroHand, oppHand])

    if (winners.length === 2) ties++
    else if (winners[0] === 'hero') wins++
  }

  return (wins + ties * 0.5) / trials
}

function sampleWithoutReplacement<T>(pool: T[], count: number, rng: () => number): T[] {
  if (count <= 0) return []
  const copy = [...pool]
  const picked: T[] = []
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length)
    picked.push(copy[idx])
    copy.splice(idx, 1)
  }
  return picked
}
