import { Hand } from 'pokersolver'
import { cardToString, type Card } from '../types/card'

export interface EvaluatedHand {
  playerId: string
  /** e.g. "Two Pair", "Flush" */
  name: string
  /** e.g. "Two Pair, A's & K's" */
  description: string
  raw: Hand
}

/** Evaluates one player's best 5-card hand from hole cards + board. */
export function evaluateHand(playerId: string, holeCards: Card[], board: Card[]): EvaluatedHand {
  const all = [...holeCards, ...board].map(cardToString)
  const hand = Hand.solve(all)
  return {
    playerId,
    name: hand.name,
    description: hand.descr,
    raw: hand,
  }
}

/** Returns the winning player id(s) — more than one on a split pot. */
export function determineWinners(hands: EvaluatedHand[]): string[] {
  const winningRawHands = Hand.winners(hands.map((h) => h.raw))
  return hands.filter((h) => winningRawHands.includes(h.raw)).map((h) => h.playerId)
}
