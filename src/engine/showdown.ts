import { determineWinners, evaluateHand } from './handEvaluator'
import { calculateSidePots } from './sidePots'
import type { HandResult, HandState } from '../types/poker'

/**
 * Resolves an actual showdown (2+ players saw it through) into payouts,
 * mutating each winner's stack and returning the results. Handles side pots
 * correctly for uneven all-ins. Uncontested wins (everyone else folded) are
 * handled separately in bettingEngine.ts — they never reach here.
 */
export function resolveShowdown(hand: HandState): HandResult[] {
  const contenders = hand.players.filter((p) => !p.isFolded && p.holeCards)
  const foldedIds = new Set(hand.players.filter((p) => p.isFolded).map((p) => p.id))
  const pots = calculateSidePots(hand.totalContributions, foldedIds)

  const evaluated = new Map(
    contenders.map((p) => [p.id, evaluateHand(p.id, p.holeCards!, hand.board)]),
  )

  const payouts = new Map<string, number>()
  for (const pot of pots) {
    const eligibleHands = pot.eligiblePlayerIds
      .map((id) => evaluated.get(id))
      .filter((h): h is NonNullable<typeof h> => h !== undefined)
    if (eligibleHands.length === 0) continue

    const winnerIds = determineWinners(eligibleHands)
    const share = Math.floor(pot.amount / winnerIds.length)
    let remainder = pot.amount - share * winnerIds.length
    for (const winnerId of winnerIds) {
      const bonus = remainder > 0 ? 1 : 0
      if (remainder > 0) remainder--
      payouts.set(winnerId, (payouts.get(winnerId) ?? 0) + share + bonus)
    }
  }

  for (const [playerId, amount] of payouts) {
    const player = hand.players.find((p) => p.id === playerId)
    if (player) player.stack += amount
  }

  return Array.from(payouts.entries()).map(([playerId, amountWon]) => ({
    playerId,
    amountWon,
    wonUncontested: false,
  }))
}
