import { describe, expect, it } from 'vitest'
import { cardFromString } from '../types/card'
import { cardsToCome, drawEquity, estimateDrawOuts } from './drawEquity'

function hand(a: string, b: string): [ReturnType<typeof cardFromString>, ReturnType<typeof cardFromString>] {
  return [cardFromString(a), cardFromString(b)]
}

function board(...codes: string[]) {
  return codes.map(cardFromString)
}

describe('estimateDrawOuts', () => {
  it('finds a 4-card flush draw worth 9 outs', () => {
    const outs = estimateDrawOuts(hand('Ah', '2h'), board('7h', 'Jh', '4c'))
    expect(outs).toBe(9)
  })

  it('finds an open-ended straight draw worth 8 outs', () => {
    // 5-6-7-8: needs a 4 or a 9 on either end.
    const outs = estimateDrawOuts(hand('5c', '6d'), board('7h', '8s', '2c'))
    expect(outs).toBe(8)
  })

  it('finds a gutshot straight draw worth 4 outs', () => {
    // 5-6-8-9: only a 7 fills the gap.
    const outs = estimateDrawOuts(hand('5c', '6d'), board('8h', '9s', '2c'))
    expect(outs).toBe(4)
  })

  it('recognizes a wheel (A-low) straight draw', () => {
    // A-2-3-4: needs a 5.
    const outs = estimateDrawOuts(hand('Ac', '2d'), board('3h', '4s', 'Kc'))
    expect(outs).toBe(4)
  })

  it('finds no draw on a dry board with unconnected cards', () => {
    const outs = estimateDrawOuts(hand('2c', '9d'), board('5h', 'Ks', 'Jc'))
    expect(outs).toBe(0)
  })

  it('combines a flush draw and a straight draw, capped at 15', () => {
    // 5h-6h open-ended (needs 4 or 9) plus a 4-card heart flush draw.
    const outs = estimateDrawOuts(hand('5h', '6h'), board('7h', '8h', '2c'))
    expect(outs).toBe(15)
  })
})

describe('cardsToCome', () => {
  it('is 2 on the flop, 1 on the turn, 0 on the river', () => {
    expect(cardsToCome(3)).toBe(2)
    expect(cardsToCome(4)).toBe(1)
    expect(cardsToCome(5)).toBe(0)
  })
})

describe('drawEquity', () => {
  it('is 0 with no outs or no cards left', () => {
    expect(drawEquity(0, 2)).toBe(0)
    expect(drawEquity(9, 0)).toBe(0)
  })

  it('approximates the rule of 4 and 2', () => {
    expect(drawEquity(9, 2)).toBeCloseTo(0.36, 5) // flush draw on the flop ≈ 36%
    expect(drawEquity(9, 1)).toBeCloseTo(0.18, 5) // flush draw on the turn ≈ 18%
  })

  it('caps at 0.95', () => {
    expect(drawEquity(15, 2)).toBeLessThanOrEqual(0.95)
  })
})
