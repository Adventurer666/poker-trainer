import { POSITIONS, type Position } from '../types/poker'

/**
 * Positions relative to the button, walking clockwise from it. Standard
 * 9-handed full-ring order: BTN acts last preflop... no wait, BTN acts last
 * POSTFLOP; preflop the order is SB, BB, UTG, ..., CO, BTN. This array is
 * seating order (who sits where relative to the button), not acting order —
 * see actingOrder() below for that.
 */
const SEATING_FROM_BUTTON: Position[] = ['BTN', 'SB', 'BB', 'UTG', 'UTG1', 'MP', 'MP1', 'HJ', 'CO']

/**
 * Maps each seat index to its Position for a hand with the button at
 * `buttonSeat`. The button moves one seat each hand, so this is recomputed
 * per hand rather than fixed on a player — that's what makes "you see every
 * player from every angle over time" (PRD) actually happen.
 */
export function assignPositions(buttonSeat: number, numSeats: number): Position[] {
  if (numSeats !== SEATING_FROM_BUTTON.length) {
    throw new Error(`assignPositions only supports ${SEATING_FROM_BUTTON.length}-handed tables`)
  }
  const bySeat: Position[] = new Array(numSeats)
  for (let seat = 0; seat < numSeats; seat++) {
    const offsetFromButton = (seat - buttonSeat + numSeats) % numSeats
    bySeat[seat] = SEATING_FROM_BUTTON[offsetFromButton]
  }
  return bySeat
}

/** Seat indices in preflop acting order (first to act first), for a given button. */
export function preflopActingOrder(buttonSeat: number, numSeats: number): number[] {
  // UTG acts first preflop; UTG is 3 seats clockwise of the button.
  const utgSeat = (buttonSeat + 3) % numSeats
  return Array.from({ length: numSeats }, (_, i) => (utgSeat + i) % numSeats)
}

/** Seat indices in postflop acting order (first to act first): SB acts first. */
export function postflopActingOrder(buttonSeat: number, numSeats: number): number[] {
  const sbSeat = (buttonSeat + 1) % numSeats
  return Array.from({ length: numSeats }, (_, i) => (sbSeat + i) % numSeats)
}

export function nextButtonSeat(currentButtonSeat: number, numSeats: number): number {
  return (currentButtonSeat + 1) % numSeats
}

/** Sanity check: every standard position appears exactly once. */
export function isValidPositionAssignment(bySeat: Position[]): boolean {
  return new Set(bySeat).size === POSITIONS.length && bySeat.length === POSITIONS.length
}
