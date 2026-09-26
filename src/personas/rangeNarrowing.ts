import { evaluateHand } from '../engine/handEvaluator'
import type { Card } from '../types/card'
import type { ActionType, HandState, Street } from '../types/poker'
import { anyComboForNotation } from './handCombos'
import { classifyPreflopAction, openRange, continueRange, threeBetRange } from './rangeModel'
import type { Persona } from './types'

/**
 * Ranks the notations in `range` strongest-to-weakest as played on `board`,
 * using one representative live combo per notation and pokersolver's own
 * comparator (category + kickers) — not just the coarse category index.
 * Notations with no live combo left (fully card-removed) are dropped.
 */
function rankRangeOnBoard(range: Set<string>, board: Card[], deadCards: Card[]): string[] {
  const scored: { notation: string; raw: ReturnType<typeof evaluateHand>['raw'] }[] = []
  for (const notation of range) {
    const combo = anyComboForNotation(notation, deadCards)
    if (!combo) continue
    const evaluated = evaluateHand(notation, combo, board)
    scored.push({ notation, raw: evaluated.raw })
  }
  scored.sort((a, b) => a.raw.compare(b.raw))
  return scored.map((s) => s.notation)
}

/**
 * How a persona's range narrows after ONE street's action, given the
 * strongest-to-weakest ranking of that range on the board as of that
 * action. This is a simplification (no true frequency-weighted range
 * construction), but it's a real step beyond treating "bet" and "check" as
 * uninformative — betting narrows hard toward value + a bluff slice sized
 * by this persona's own bluff frequency; calling trims only the weakest
 * fraction; checking is left alone (too little information to act on).
 */
function narrowForAction(ranked: string[], actionType: ActionType, persona: Persona): Set<string> {
  if (ranked.length === 0) return new Set()

  if (actionType === 'bet' || actionType === 'raise' || actionType === 'all-in') {
    const valueCount = Math.max(1, Math.round(ranked.length * 0.35))
    const valueSlice = ranked.slice(0, valueCount)
    const bluffFraction = Math.min(0.5, persona.tendencies.bluffFrequency / 100)
    const bluffCount = Math.max(0, Math.round(ranked.length * bluffFraction * 0.3))
    const bluffSlice = bluffCount > 0 ? ranked.slice(Math.max(valueCount, ranked.length - bluffCount)) : []
    return new Set([...valueSlice, ...bluffSlice])
  }

  if (actionType === 'call') {
    const dropCount = Math.round(ranked.length * 0.15)
    return new Set(ranked.slice(0, ranked.length - dropCount))
  }

  // check (or anything else): not enough information to narrow.
  return new Set(ranked)
}

/**
 * The full "advanced" reasoning: start from the player's real preflop
 * range (same classification/percentages the bot itself used to act — see
 * rangeModel.ts), then narrow it once per postflop street they've acted
 * on, using the board as it stood at the time of that action. This is what
 * separates an "advanced" opponent model from an "intermediate" one, which
 * just uses the flat preflop range for the whole hand regardless of how
 * they've played it since.
 */
export function believedRangeForOpponent(
  hand: HandState,
  opponentId: string,
  persona: Persona,
  deadCards: Card[],
): Set<string> {
  const player = hand.players.find((p) => p.id === opponentId)
  if (!player) return new Set()

  const preflopClassification = classifyPreflopAction(hand, opponentId)
  let range: Set<string>
  switch (preflopClassification) {
    case 'open':
      range = openRange(persona, player.position)
      break
    case 'continue':
      range = continueRange(persona, player.position)
      break
    case 'three-bet':
      range = threeBetRange(persona, player.position)
      break
    case 'folded':
      return new Set()
  }

  const boardLengthForStreet: Record<Street, number> = {
    preflop: 0,
    flop: 3,
    turn: 4,
    river: 5,
    showdown: 5,
  }

  const postflopStreets: Street[] = ['flop', 'turn', 'river']
  for (const street of postflopStreets) {
    const actionsThisStreet = hand.actionHistory.filter((a) => a.street === street && a.playerId === opponentId)
    if (actionsThisStreet.length === 0) continue
    const boardAsOfStreet = hand.board.slice(0, boardLengthForStreet[street])
    // Use their LAST action on the street (e.g. check-then-call-a-raise is
    // more informative as "call" than as "check").
    const lastAction = actionsThisStreet[actionsThisStreet.length - 1]
    const ranked = rankRangeOnBoard(range, boardAsOfStreet, [...deadCards, ...boardAsOfStreet])
    range = narrowForAction(ranked, lastAction.type, persona)
    if (range.size === 0) break
  }

  return range
}
