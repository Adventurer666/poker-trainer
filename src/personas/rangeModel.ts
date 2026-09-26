import type { HandState, Position } from '../types/poker'
import { topPercentRange } from './handRanking'
import type { Persona } from './types'

/**
 * The preflop range math shared between the bot's own decision-making
 * (botDecision.ts) and the ground-truth range shown to the player after a
 * hand (rangeReview). Keeping this in one place means the "ground truth"
 * shown for feedback is *exactly* the range the bot actually reasoned from —
 * not a second, potentially-drifted approximation of it.
 */

export function openRangePercent(persona: Persona, position: Position): number {
  return persona.openingRangeByPosition[position]
}

/** Range continued with after facing a raise (calling range). */
export function continueRangePercent(persona: Persona, position: Position): number {
  return openRangePercent(persona, position) * 0.6
}

/** Range re-raised with after facing a raise (3-bet range). */
export function threeBetRangePercent(persona: Persona, position: Position): number {
  return Math.max(2, openRangePercent(persona, position) * (persona.tendencies.threeBetFrequency / 100) * 2)
}

export function openRange(persona: Persona, position: Position): Set<string> {
  return topPercentRange(openRangePercent(persona, position))
}

export function continueRange(persona: Persona, position: Position): Set<string> {
  return topPercentRange(continueRangePercent(persona, position))
}

export function threeBetRange(persona: Persona, position: Position): Set<string> {
  return topPercentRange(threeBetRangePercent(persona, position))
}

export type PreflopClassification = 'open' | 'continue' | 'three-bet' | 'folded'

/**
 * Classifies how this player actually played preflop this hand, by walking
 * their preflop action history in order — the same logic botDecision.ts
 * used to *choose* an action, run in reverse to figure out which range
 * their action came from. 'folded' means they're out — no range to compare.
 */
export function classifyPreflopAction(hand: HandState, playerId: string): PreflopClassification {
  const preflopActions = hand.actionHistory.filter((a) => a.street === 'preflop')
  let raisesSoFar = 0
  let classification: PreflopClassification = 'folded'

  for (const action of preflopActions) {
    if (action.playerId === playerId) {
      if (action.type === 'raise' || action.type === 'bet') {
        classification = raisesSoFar === 0 ? 'open' : 'three-bet'
      } else if (action.type === 'all-in' && action.amount > 0) {
        // An all-in that actually raised counts as aggression; one that only
        // called does not — but we don't have that distinction here, so
        // treat any all-in as aggression, matching the common case.
        classification = raisesSoFar === 0 ? 'open' : 'three-bet'
      } else if (action.type === 'call') {
        classification = 'continue'
      } else if (action.type === 'check') {
        classification = 'open' // BB raising with the option, in effect
      } else if (action.type === 'fold') {
        classification = 'folded'
      }
    }
    if (action.type === 'raise' || action.type === 'bet') raisesSoFar++
  }

  return classification
}

/**
 * The range a player's persona was actually representing this hand, based
 * on their real preflop action — the "ground truth" the trainer scores a
 * tracked read against. Returns an empty set if they folded (no reveal).
 */
export function groundTruthRangeForPlayer(
  hand: HandState,
  playerId: string,
  persona: Persona,
): Set<string> {
  const player = hand.players.find((p) => p.id === playerId)
  if (!player) return new Set()

  const classification = classifyPreflopAction(hand, playerId)
  switch (classification) {
    case 'open':
      return openRange(persona, player.position)
    case 'continue':
      return continueRange(persona, player.position)
    case 'three-bet':
      return threeBetRange(persona, player.position)
    case 'folded':
      return new Set()
  }
}
