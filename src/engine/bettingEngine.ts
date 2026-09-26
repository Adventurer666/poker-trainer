import { dealCards } from './deck'
import { assignPositions, postflopActingOrder, preflopActingOrder } from './positions'
import type {
  ActionType,
  BlindsConfig,
  HandState,
  Player,
  Street,
} from '../types/poker'
import type { Card } from '../types/card'

export interface ActionInput {
  type: ActionType
  /** For 'bet'/'raise': the TOTAL amount this player will have put in this
   *  street after the action (i.e. "raise to X", not "raise by X"). Ignored
   *  for fold/check/call/all-in. */
  amount?: number
}

export interface LegalActions {
  types: ActionType[]
  /** Chips needed to call (0 if check is available). */
  callAmount: number
  /** Minimum legal total-this-street amount for a bet/raise. */
  minRaiseTo: number
  /** Maximum legal total-this-street amount for a bet/raise (= going all-in). */
  maxRaiseTo: number
}

const STREET_ORDER: Street[] = ['preflop', 'flop', 'turn', 'river', 'showdown']

function activePlayers(hand: HandState): Player[] {
  return hand.players.filter((p) => !p.isFolded)
}

function clone(hand: HandState): HandState {
  return structuredClone(hand)
}

/** Deals hole cards, posts blinds, and sets up the first preflop action. */
export function createHand(
  handId: string,
  seatedPlayers: Player[],
  buttonSeat: number,
  blinds: BlindsConfig,
  deck: Card[],
): HandState {
  const numSeats = seatedPlayers.length
  const positions = assignPositions(buttonSeat, numSeats)
  let remainingDeck = deck

  const players: Player[] = seatedPlayers.map((p) => {
    const { dealt, remaining } = dealCards(remainingDeck, 2)
    remainingDeck = remaining
    return {
      ...p,
      position: positions[p.seat],
      isFolded: false,
      isAllIn: false,
      holeCards: dealt,
    }
  })

  const streetContributions: Record<string, number> = {}
  const totalContributions: Record<string, number> = {}
  for (const p of players) {
    streetContributions[p.id] = 0
    totalContributions[p.id] = 0
  }

  const order = preflopActingOrder(buttonSeat, numSeats)
  const sbSeat = order[order.length - 2] // second-to-last preflop actor is SB
  const bbSeat = order[order.length - 1] // BB acts last preflop (has the option)
  const sbPlayer = players.find((p) => p.seat === sbSeat)!
  const bbPlayer = players.find((p) => p.seat === bbSeat)!

  postBlind(sbPlayer, Math.min(blinds.smallBlind, sbPlayer.stack), streetContributions, totalContributions)
  postBlind(bbPlayer, Math.min(blinds.bigBlind, bbPlayer.stack), streetContributions, totalContributions)

  const pot = streetContributions[sbPlayer.id] + streetContributions[bbPlayer.id]

  const hand: HandState = {
    handId,
    street: 'preflop',
    board: [],
    pot,
    players,
    actionHistory: [],
    buttonSeat,
    toActPlayerId: null,
    blinds,
    deck: remainingDeck,
    currentBet: blinds.bigBlind,
    minRaiseAmount: blinds.bigBlind,
    streetContributions,
    totalContributions,
    actedThisStreet: [],
    isHandComplete: false,
    results: [],
  }

  hand.toActPlayerId = findNextToAct(hand, order, -1)
  return finalizeIfNeeded(hand)
}

function postBlind(
  player: Player,
  amount: number,
  streetContributions: Record<string, number>,
  totalContributions: Record<string, number>,
) {
  player.stack -= amount
  streetContributions[player.id] = amount
  totalContributions[player.id] = amount
  if (player.stack === 0) player.isAllIn = true
}

function actingOrderFor(hand: HandState): number[] {
  return hand.street === 'preflop'
    ? preflopActingOrder(hand.buttonSeat, hand.players.length)
    : postflopActingOrder(hand.buttonSeat, hand.players.length)
}

/** Finds the next active (not folded, not all-in) player after `afterIndex` in `order`. */
function findNextToAct(hand: HandState, order: number[], afterIndex: number): string | null {
  const bySeat = new Map(hand.players.map((p) => [p.seat, p]))
  for (let i = 1; i <= order.length; i++) {
    const seat = order[(afterIndex + i) % order.length]
    const player = bySeat.get(seat)
    if (player && !player.isFolded && !player.isAllIn) return player.id
  }
  return null
}

export function legalActions(hand: HandState, playerId: string): LegalActions {
  const player = hand.players.find((p) => p.id === playerId)
  if (!player || player.isFolded || player.isAllIn) {
    return { types: [], callAmount: 0, minRaiseTo: 0, maxRaiseTo: 0 }
  }

  const contributed = hand.streetContributions[playerId] ?? 0
  const callAmount = Math.max(0, hand.currentBet - contributed)
  const maxTotal = contributed + player.stack // going all-in

  const types: ActionType[] = ['fold']
  if (callAmount === 0) {
    types.push('check')
  } else {
    types.push('call')
  }

  const minRaiseTo = hand.currentBet + hand.minRaiseAmount
  if (maxTotal > hand.currentBet) {
    // Can only raise/bet if they have more chips than just calling would use.
    types.push(hand.currentBet === 0 ? 'bet' : 'raise')
  }
  if (player.stack > 0) types.push('all-in')

  return {
    types,
    callAmount: Math.min(callAmount, player.stack),
    minRaiseTo: Math.min(minRaiseTo, maxTotal),
    maxRaiseTo: maxTotal,
  }
}

export function applyAction(
  handIn: HandState,
  playerId: string,
  input: ActionInput,
  thinkTimeMs = 0,
): HandState {
  const hand = clone(handIn)
  const player = hand.players.find((p) => p.id === playerId)
  if (!player) throw new Error(`Unknown player ${playerId}`)
  if (hand.toActPlayerId !== playerId) {
    throw new Error(`It is not ${playerId}'s turn`)
  }

  const legal = legalActions(hand, playerId)
  if (!legal.types.includes(input.type)) {
    throw new Error(`${input.type} is not legal for ${playerId} right now`)
  }

  const contributed = hand.streetContributions[playerId] ?? 0
  let amountThisAction = 0
  let isAggressive = false

  switch (input.type) {
    case 'fold': {
      player.isFolded = true
      break
    }
    case 'check': {
      break
    }
    case 'call': {
      amountThisAction = legal.callAmount
      break
    }
    case 'bet':
    case 'raise': {
      const target = input.amount ?? legal.minRaiseTo
      if (target < legal.minRaiseTo || target > legal.maxRaiseTo) {
        throw new Error(
          `${input.type} to ${target} is out of legal range [${legal.minRaiseTo}, ${legal.maxRaiseTo}]`,
        )
      }
      amountThisAction = target - contributed
      isAggressive = true
      break
    }
    case 'all-in': {
      amountThisAction = player.stack
      isAggressive = amountThisAction + contributed > hand.currentBet
      break
    }
  }

  if (input.type !== 'fold' && input.type !== 'check') {
    player.stack -= amountThisAction
    hand.streetContributions[playerId] = contributed + amountThisAction
    hand.totalContributions[playerId] = (hand.totalContributions[playerId] ?? 0) + amountThisAction
    hand.pot += amountThisAction
    if (player.stack === 0) player.isAllIn = true
  }

  const newTotal = hand.streetContributions[playerId]
  if (isAggressive && newTotal > hand.currentBet) {
    const increment = newTotal - hand.currentBet
    if (increment >= hand.minRaiseAmount) {
      hand.minRaiseAmount = increment
    }
    hand.currentBet = newTotal
    // A raise reopens the action: everyone else must act again.
    hand.actedThisStreet = [playerId]
  } else {
    if (!hand.actedThisStreet.includes(playerId)) {
      hand.actedThisStreet = [...hand.actedThisStreet, playerId]
    }
  }

  hand.actionHistory.push({
    playerId,
    street: hand.street,
    type: input.type,
    amount: amountThisAction,
    thinkTimeMs,
  })

  return resolveNextStep(hand)
}

function isBettingRoundComplete(hand: HandState): boolean {
  const contestants = activePlayers(hand).filter((p) => !p.isAllIn)
  return contestants.every(
    (p) => hand.actedThisStreet.includes(p.id) && hand.streetContributions[p.id] === hand.currentBet,
  )
}

/** After an action: check for an uncontested win, a completed betting round, or neither. */
function resolveNextStep(hand: HandState): HandState {
  const remaining = activePlayers(hand)
  if (remaining.length === 1) {
    return awardUncontestedPot(hand, remaining[0].id)
  }

  if (isBettingRoundComplete(hand)) {
    return advanceStreetOrRunout(hand)
  }

  const order = actingOrderFor(hand)
  const currentSeat = hand.players.find((p) => p.id === hand.toActPlayerId)?.seat
  const afterIndex =
    currentSeat !== undefined ? order.indexOf(currentSeat) : -1
  hand.toActPlayerId = findNextToAct(hand, order, afterIndex)
  return hand
}

function awardUncontestedPot(hand: HandState, winnerId: string): HandState {
  const winner = hand.players.find((p) => p.id === winnerId)!
  winner.stack += hand.pot
  hand.results = [{ playerId: winnerId, amountWon: hand.pot, wonUncontested: true }]
  hand.isHandComplete = true
  hand.toActPlayerId = null
  hand.street = 'showdown'
  return hand
}

function dealCommunity(hand: HandState, count: number): void {
  const { dealt, remaining } = dealCards(hand.deck, count)
  hand.board = [...hand.board, ...dealt]
  hand.deck = remaining
}

/**
 * Moves to the next street once betting is complete on this one. If two or
 * fewer players can still act (everyone else is all-in), no more betting is
 * possible — deal straight through to the river ("runout") instead of
 * stopping to ask for actions nobody can take.
 */
function advanceStreetOrRunout(hand: HandState): HandState {
  while (hand.street !== 'showdown' && hand.street !== 'river') {
    const nextStreet = STREET_ORDER[STREET_ORDER.indexOf(hand.street) + 1]
    if (nextStreet === 'flop') dealCommunity(hand, 3)
    else if (nextStreet === 'turn' || nextStreet === 'river') dealCommunity(hand, 1)

    hand.street = nextStreet
    for (const p of hand.players) hand.streetContributions[p.id] = 0
    hand.currentBet = 0
    hand.minRaiseAmount = hand.blinds.bigBlind
    hand.actedThisStreet = []

    const contestants = activePlayers(hand).filter((p) => !p.isAllIn)
    if (contestants.length >= 2) {
      hand.toActPlayerId = findNextToAct(hand, actingOrderFor(hand), -1)
      return hand
    }
    // Fewer than 2 players can act — keep dealing (runout continues in the loop).
  }

  if (hand.street === 'river') {
    hand.street = 'showdown'
  }
  hand.isHandComplete = true
  hand.toActPlayerId = null
  return hand
}

function finalizeIfNeeded(hand: HandState): HandState {
  // Covers the (rare) case where blinds alone leave <2 players able to act,
  // e.g. an extremely short-stacked BB posting their whole stack.
  const contestants = activePlayers(hand).filter((p) => !p.isAllIn)
  if (contestants.length < 2 && activePlayers(hand).length > 1) {
    return advanceStreetOrRunout(hand)
  }
  return hand
}
