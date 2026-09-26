import { describe, expect, it } from 'vitest'
import { cardFromString } from '../types/card'
import { determineWinners, evaluateHand } from './handEvaluator'

const cards = (codes: string[]) => codes.map(cardFromString)

describe('evaluateHand', () => {
  it('identifies a flush', () => {
    const result = evaluateHand(
      'p1',
      cards(['As', 'Ks']),
      cards(['2s', '7s', '9s', '4h', 'Jd']),
    )
    expect(result.name).toBe('Flush')
  })

  it('identifies a pair', () => {
    const result = evaluateHand(
      'p1',
      cards(['As', 'Ah']),
      cards(['2s', '7c', '9d', '4h', 'Jd']),
    )
    expect(result.name).toBe('Pair')
  })
})

describe('determineWinners', () => {
  it('picks the higher two pair', () => {
    const board = cards(['2s', '7c', '9d', '4h', 'Jd'])
    const p1 = evaluateHand('p1', cards(['As', 'Ah']), board)
    const p2 = evaluateHand('p2', cards(['Ks', 'Kh']), board)
    expect(determineWinners([p1, p2])).toEqual(['p1'])
  })

  it('splits the pot on a tie', () => {
    const board = cards(['Ah', 'Kh', 'Qh', 'Jh', 'Th'])
    const p1 = evaluateHand('p1', cards(['2s', '3c']), board)
    const p2 = evaluateHand('p2', cards(['4d', '5c']), board)
    expect(determineWinners([p1, p2]).sort()).toEqual(['p1', 'p2'])
  })
})
