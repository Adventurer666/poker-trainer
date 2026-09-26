import { evaluateHand } from '../engine/handEvaluator'
import { legalActions } from '../engine/bettingEngine'
import type { ActionInput } from '../engine/bettingEngine'
import type { Card } from '../types/card'
import type { HandState, Player } from '../types/poker'
import { cardsToCome, drawEquity, estimateDrawOuts } from './drawEquity'
import { handNotation } from './handNotation'
import { continueRange, continueRangePercent, openRange, openRangePercent, threeBetRange } from './rangeModel'
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
 * Rough approximate showdown-equity value per made-hand category. This is
 * NOT "category index / 9" — that linear scale badly undervalues a made
 * hand (a bare pair scored only 0.11, meaning top pair folded to almost any
 * bet-sized threshold). These numbers instead aim at "roughly how often
 * this category wins a random showdown", which is still a simplification
 * (no board-texture or kicker awareness) but is far closer to how a made
 * hand should actually be treated than a linear index.
 */
const HAND_CATEGORY_EQUITY: Record<string, number> = {
  'High Card': 0.15,
  Pair: 0.45,
  'Two Pair': 0.65,
  'Three of a Kind': 0.75,
  Straight: 0.82,
  Flush: 0.87,
  'Full House': 0.93,
  'Four of a Kind': 0.97,
  'Straight Flush': 0.99,
  'Royal Flush': 1,
}

/** Category index (0 = High Card .. 9 = Royal Flush), or -1 before there's a board to evaluate against. */
function madeHandCategoryIndex(player: Player, board: HandState['board']): number {
  if (!player.holeCards || board.length < 3) return -1
  const evaluated = evaluateHand(player.id, player.holeCards, board)
  return HAND_CATEGORY_ORDER.indexOf(evaluated.name)
}

/**
 * 0..1 hand strength: the made hand's approximate equity (see
 * HAND_CATEGORY_EQUITY), blended with a rough draw-equity estimate
 * (flush/straight draws, via the rule of 4-and-2) whenever that's actually
 * higher. This is still a deliberate simplification (no real
 * equity-vs-range calculation), but it stops a flush draw or an open-ender
 * from being scored identically to 7-2 offsuit — which was previously
 * making bots fold draws (and, via the old linear scale, even made hands
 * like top pair) to any bet, regardless of their odds to continue.
 */
function handStrength(player: Player, board: HandState['board']): number {
  const index = madeHandCategoryIndex(player, board)
  if (index < 0) return 0
  const madeStrength = HAND_CATEGORY_EQUITY[HAND_CATEGORY_ORDER[index]] ?? 0.15

  const outs = estimateDrawOuts(player.holeCards as [Card, Card], board)
  const equity = drawEquity(outs, cardsToCome(board.length))

  return Math.max(madeStrength, equity)
}

/**
 * How much made/draw strength a persona needs to continue, scaled by how
 * loose they play overall (their VPIP). Previously this threshold was the
 * same for every persona, so The Rock and the Calling Station folded to a
 * bet at the exact same strength — now a loose player needs meaningfully
 * less to keep calling, and a tight player needs slightly more.
 */
function requiredStrengthFor(persona: Persona, potOddsFactor: number): number {
  const base = 0.1 + potOddsFactor * 0.5
  // vpip 12 (The Rock) -> ~0 looseness; vpip 55 (The Maniac) -> ~1 looseness.
  const looseness = Math.min(1, Math.max(0, (persona.tendencies.vpip - 12) / 43))
  const adjusted = base * (1 - looseness * 0.35)
  // Floor stays at/above plain "High Card" equity (0.15) so even the
  // loosest persona still folds air outright sometimes, rather than the
  // threshold dropping low enough to call literally any two cards for
  // free every time — looser personas instead lean on the bluff-catch
  // roll below to call more OFTEN, not unconditionally.
  return Math.min(0.9, Math.max(0.16, adjusted))
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
  const myOpenRangePercent = openRangePercent(persona, player.position)
  const inOpenRange = openRange(persona, player.position).has(notation)

  // No one has raised beyond the big blind yet — this is an opening decision
  // (for the BB specifically, it's "raise with the option" vs. check).
  const noOneHasRaisedYet = hand.currentBet === hand.blinds.bigBlind
  const closenessToOpenCutoff = 1 - Math.min(1, myOpenRangePercent / 50)

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
  const inContinueRange = continueRange(persona, player.position).has(notation)
  const inThreeBetRange = threeBetRange(persona, player.position).has(notation)
  const closeness = 1 - Math.min(1, continueRangePercent(persona, player.position) / 30)

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
  const hasMadeHand = madeHandCategoryIndex(player, hand.board) >= 1 // at least a pair
  const canCheck = legal.callAmount === 0

  if (canCheck) {
    const wantsValueBet = hasMadeHand && rng() < persona.tendencies.cbetFrequency / 100
    const wantsBluff = !hasMadeHand && rng() < persona.tendencies.bluffFrequency / 100
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
  const requiredStrength = requiredStrengthFor(persona, potOddsFactor)
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
  if (rng() < (persona.tendencies.bluffFrequency / 100) * 0.35 && legal.types.includes('raise')) {
    const target = clampToLegalRaise(
      hand.currentBet + hand.pot * persona.tendencies.sizingTendency,
      legal.minRaiseTo,
      legal.maxRaiseTo,
    )
    return { action: { type: 'raise', amount: target }, thinkTimeMs: thinkTime(persona, 0.85, true, rng) }
  }
  // Below their real continuing threshold, but a loose-enough persona with
  // good enough pot odds will still bluff-catch sometimes rather than
  // folding on cue every single time.
  const bluffCatchChance = (persona.tendencies.vpip / 100) * (1 - potOddsFactor) * 0.3
  if (rng() < bluffCatchChance) {
    return { action: { type: 'call' }, thinkTimeMs: thinkTime(persona, 0.4, false, rng) }
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
