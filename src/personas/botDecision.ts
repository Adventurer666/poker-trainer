import { evaluateHand } from '../engine/handEvaluator'
import { legalActions } from '../engine/bettingEngine'
import type { ActionInput } from '../engine/bettingEngine'
import type { Card } from '../types/card'
import type { HandState, Player } from '../types/poker'
import { handNotation } from './handNotation'
import { topPercentRange } from './handRanking'
import type { Persona } from './types'

export interface BotDecision {
  action: ActionInput
  thinkTimeMs: number
}

const HAND_CATEGORY_ORDER = [
  'High Card',
  'Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
  'Royal Flush',
]

/**
 * Coarse 0..1 made-hand strength from pokersolver's hand category. This is a
 * deliberate simplification (no equity-vs-range calculation) — good enough
 * to drive believable bot decisions for v1; a real equity model is a
 * plausible later refinement, not a v1 requirement.
 */
function handStrength(player: Player, board: HandState['board']): number {
  if (!player.holeCards || board.length < 3) return 0
  const evaluated = evaluateHand(player.id, player.holeCards, board)
  const index = HAND_CATEGORY_ORDER.indexOf(evaluated.name)
  return index < 0 ? 0 : index / (HAND_CATEGORY_ORDER.length - 1)
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * Math.max(0, Math.min(1, t))
}

function thinkTime(persona: Persona, closeness: number, isBluff: boolean, rng: () => number): number {
  if (persona.thinkTime.usesSnapDecisionsAsBluffTell && isBluff && rng() < 0.5) {
    return persona.thinkTime.minMs
  }
  return Math.round(lerp(persona.thinkTime.minMs, persona.thinkTime.maxMs, closeness))
}

function clampToLegalRaise(target: number, minRaiseTo: number, maxRaiseTo: number): number {
  return Math.round(Math.max(minRaiseTo, Math.min(maxRaiseTo, target)))
}

function decidePreflop(
  hand: HandState,
  player: Player,
  persona: Persona,
  rng: () => number,
): BotDecision {
  const legal = legalActions(hand, player.id)
  const notation = handNotation(player.holeCards as [Card, Card])
  const openRangePercent = persona.openingRangeByPosition[player.position]
  const inOpenRange = topPercentRange(openRangePercent).has(notation)

  // No one has raised beyond the big blind yet — this is an opening decision
  // (for the BB specifically, it's "raise with the option" vs. check).
  const noOneHasRaisedYet = hand.currentBet === hand.blinds.bigBlind
  const closenessToOpenCutoff = 1 - Math.min(1, openRangePercent / 50)

  if (noOneHasRaisedYet) {
    const canOpen = inOpenRange && (legal.types.includes('raise') || legal.types.includes('bet'))
    if (canOpen) {
      const sizeInBb = 2 + persona.tendencies.sizingTendency * 1.5
      const target = clampToLegalRaise(
        hand.blinds.bigBlind * sizeInBb,
        legal.minRaiseTo,
        legal.maxRaiseTo,
      )
      return {
        action: { type: legal.types.includes('raise') ? 'raise' : 'bet', amount: target },
        thinkTimeMs: thinkTime(persona, closenessToOpenCutoff, false, rng),
      }
    }
    // Not opening: the BB can check for free; everyone else must fold (v1
    // doesn't model limping as a separate choice from opening/folding).
    const declineAction: ActionInput = legal.types.includes('check') ? { type: 'check' } : { type: 'fold' }
    return {
      action: declineAction,
      thinkTimeMs: thinkTime(persona, closenessToOpenCutoff, false, rng),
    }
  }

  // Facing a raise: continue with a tighter slice of the range, 3-bet with
  // the strongest slice of that, per this persona's 3-bet frequency.
  const continueRangePercent = openRangePercent * 0.6
  const threeBetRangePercent = Math.max(2, openRangePercent * (persona.tendencies.threeBetFrequency / 100) * 2)
  const inContinueRange = topPercentRange(continueRangePercent).has(notation)
  const inThreeBetRange = topPercentRange(threeBetRangePercent).has(notation)
  const closeness = 1 - Math.min(1, continueRangePercent / 30)

  if (inThreeBetRange && legal.types.includes('raise')) {
    const target = clampToLegalRaise(hand.currentBet * 3, legal.minRaiseTo, legal.maxRaiseTo)
    return { action: { type: 'raise', amount: target }, thinkTimeMs: thinkTime(persona, closeness, false, rng) }
  }
  if (inContinueRange) {
    return { action: { type: 'call' }, thinkTimeMs: thinkTime(persona, closeness, false, rng) }
  }
  // Occasional preflop bluff-raise (a light 3-bet) even outside the "real" range.
  if (rng() < persona.tendencies.bluffFrequency / 100 / 4 && legal.types.includes('raise')) {
    const target = clampToLegalRaise(hand.currentBet * 3, legal.minRaiseTo, legal.maxRaiseTo)
    return { action: { type: 'raise', amount: target }, thinkTimeMs: thinkTime(persona, 0.8, true, rng) }
  }
  return { action: { type: 'fold' }, thinkTimeMs: thinkTime(persona, closeness, false, rng) }
}

function decidePostflop(
  hand: HandState,
  player: Player,
  persona: Persona,
  rng: () => number,
): BotDecision {
  const legal = legalActions(hand, player.id)
  const strength = handStrength(player, hand.board)
  const canCheck = legal.callAmount === 0

  if (canCheck) {
    const valueThreshold = 0.1 // roughly "at least a pair"
    const wantsValueBet = strength >= valueThreshold && rng() < persona.tendencies.cbetFrequency / 100
    const wantsBluff = strength < valueThreshold && rng() < persona.tendencies.bluffFrequency / 100
    if ((wantsValueBet || wantsBluff) && legal.types.includes('bet')) {
      const target = clampToLegalRaise(
        hand.pot * persona.tendencies.sizingTendency,
        legal.minRaiseTo,
        legal.maxRaiseTo,
      )
      return {
        action: { type: 'bet', amount: target },
        thinkTimeMs: thinkTime(persona, 1 - strength, wantsBluff, rng),
      }
    }
    return { action: { type: 'check' }, thinkTimeMs: thinkTime(persona, 0.3, false, rng) }
  }

  const potOddsFactor = legal.callAmount / (hand.pot + legal.callAmount)
  const requiredStrength = Math.min(0.9, 0.1 + potOddsFactor * 0.5)
  const closeness = 1 - Math.abs(strength - requiredStrength)

  if (strength >= requiredStrength + 0.25 && legal.types.includes('raise')) {
    const target = clampToLegalRaise(
      hand.currentBet + hand.pot * persona.tendencies.sizingTendency,
      legal.minRaiseTo,
      legal.maxRaiseTo,
    )
    return { action: { type: 'raise', amount: target }, thinkTimeMs: thinkTime(persona, closeness, false, rng) }
  }
  if (strength >= requiredStrength) {
    return { action: { type: 'call' }, thinkTimeMs: thinkTime(persona, closeness, false, rng) }
  }
  if (rng() < (persona.tendencies.bluffFrequency / 100) * 0.3 && legal.types.includes('raise')) {
    const target = clampToLegalRaise(
      hand.currentBet + hand.pot * persona.tendencies.sizingTendency,
      legal.minRaiseTo,
      legal.maxRaiseTo,
    )
    return { action: { type: 'raise', amount: target }, thinkTimeMs: thinkTime(persona, 0.85, true, rng) }
  }
  return { action: { type: 'fold' }, thinkTimeMs: thinkTime(persona, closeness, false, rng) }
}

export function decideBotAction(
  hand: HandState,
  playerId: string,
  persona: Persona,
  rng: () => number = Math.random,
): BotDecision {
  const player = hand.players.find((p) => p.id === playerId)
  if (!player || !player.holeCards) {
    throw new Error(`Cannot decide an action for ${playerId}: no hole cards`)
  }
  return hand.street === 'preflop'
    ? decidePreflop(hand, player, persona, rng)
    : decidePostflop(hand, player, persona, rng)
}
