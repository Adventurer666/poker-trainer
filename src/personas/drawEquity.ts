import { RANKS, type Card } from '../types/card'

const RANK_INDEX: Record<string, number> = Object.fromEntries(RANKS.map((r, i) => [r, i]))

/**
 * Rough draw-outs estimate from hole cards + board: flush draws (4 cards of
 * one suit → 9 outs) and straight draws (open-ended → 8 outs, gutshot → 4
 * outs). This is a deliberate simplification — no combinatorics against
 * opponents' possible holdings — but it's enough to stop bots from folding
 * a flush draw or an open-ender as if it were the same hand as 7-2 offsuit.
 */
export function estimateDrawOuts(holeCards: [Card, Card], board: Card[]): number {
  const cards = [...holeCards, ...board]
  let outs = 0

  const suitCounts = new Map<string, number>()
  for (const c of cards) suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1)
  if ([...suitCounts.values()].some((n) => n === 4)) outs += 9

  const indices = new Set(cards.map((c) => RANK_INDEX[c.rank]))
  const hasAce = indices.has(RANK_INDEX.A)

  let openEnded = false
  let gutshot = false

  // Standard runs across the real rank range (2..A), Ace counted high only —
  // this alone correctly handles broadway (…T-J-Q-K needing 9 or A) since
  // the window range already extends up to index 12.
  for (let start = 0; start <= 8; start++) {
    const window = [start, start + 1, start + 2, start + 3, start + 4]
    const present = window.filter((i) => indices.has(i))
    if (present.length === 4) {
      const missing = window.find((i) => !indices.has(i))!
      const isEnd = missing === window[0] || missing === window[4]
      if (isEnd) openEnded = true
      else gutshot = true
    }
  }

  // The wheel (A-2-3-4 needing a 5) is a real out, but one-sided — there's
  // no card below the Ace-low — so it's gutshot-grade (4 outs) even though
  // it sits at the "end" of the A-2-3-4-5 run.
  if (hasAce) {
    const wheelWindow = [0, 1, 2, 3] // ranks 2, 3, 4, 5
    const present = wheelWindow.filter((i) => indices.has(i))
    if (present.length === 3) gutshot = true
  }

  if (openEnded) outs += 8
  else if (gutshot) outs += 4

  return Math.min(outs, 15) // combo draws (e.g. flush + straight) cap out here
}

/** How many cards are still to come this street — draws are only worth something before the river. */
export function cardsToCome(boardLength: number): number {
  if (boardLength === 3) return 2 // flop: turn + river
  if (boardLength === 4) return 1 // turn: river only
  return 0 // river: nothing left to draw to
}

/** Rule-of-4-and-2 approximation: ~4% equity per out with two cards to come, ~2% with one. */
export function drawEquity(outs: number, remainingCards: number): number {
  const perCard = remainingCards === 2 ? 0.04 : remainingCards === 1 ? 0.02 : 0
  return Math.min(0.95, outs * perCard)
}
