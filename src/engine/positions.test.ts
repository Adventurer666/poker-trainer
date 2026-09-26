import { describe, expect, it } from 'vitest'
import {
  assignPositions,
  isValidPositionAssignment,
  nextButtonSeat,
  postflopActingOrder,
  preflopActingOrder,
} from './positions'

describe('assignPositions', () => {
  it('assigns every standard position exactly once', () => {
    const bySeat = assignPositions(6, 9)
    expect(isValidPositionAssignment(bySeat)).toBe(true)
  })

  it('puts the button seat at BTN', () => {
    const bySeat = assignPositions(6, 9)
    expect(bySeat[6]).toBe('BTN')
  })

  it('rotates correctly as the button moves', () => {
    const before = assignPositions(3, 9)
    const after = assignPositions(4, 9)
    // The seat that was BTN is now CO (one seat behind the new button).
    expect(before[3]).toBe('BTN')
    expect(after[3]).toBe('CO')
    expect(after[4]).toBe('BTN')
  })

  it('rejects a non-9-handed table', () => {
    expect(() => assignPositions(0, 6)).toThrow()
  })
})

describe('preflopActingOrder', () => {
  it('starts at UTG and ends at BB', () => {
    const buttonSeat = 6
    const bySeat = assignPositions(buttonSeat, 9)
    const order = preflopActingOrder(buttonSeat, 9)
    expect(bySeat[order[0]]).toBe('UTG')
    expect(bySeat[order[order.length - 1]]).toBe('BB')
  })
})

describe('postflopActingOrder', () => {
  it('starts at SB and ends at BTN', () => {
    const buttonSeat = 6
    const bySeat = assignPositions(buttonSeat, 9)
    const order = postflopActingOrder(buttonSeat, 9)
    expect(bySeat[order[0]]).toBe('SB')
    expect(bySeat[order[order.length - 1]]).toBe('BTN')
  })
})

describe('nextButtonSeat', () => {
  it('wraps around the table', () => {
    expect(nextButtonSeat(8, 9)).toBe(0)
    expect(nextButtonSeat(3, 9)).toBe(4)
  })
})
