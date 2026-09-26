import { describe, expect, it } from 'vitest'
import { allStartingHands, chenScore, topPercentRange } from './handRanking'

describe('allStartingHands', () => {
  it('produces exactly 169 canonical hands', () => {
    expect(allStartingHands()).toHaveLength(169)
  })
})

describe('chenScore', () => {
  it('ranks AA as the strongest hand', () => {
    const scores = allStartingHands().map((h) => chenScore(h))
    expect(chenScore('AA')).toBe(Math.max(...scores))
  })

  it('scores suited cards higher than the same cards offsuit', () => {
    expect(chenScore('AKs')).toBeGreaterThan(chenScore('AKo'))
  })

  it('scores a big pair higher than a weak offsuit hand', () => {
    expect(chenScore('KK')).toBeGreaterThan(chenScore('72o'))
  })
})

describe('topPercentRange', () => {
  it('always includes AA', () => {
    expect(topPercentRange(2).has('AA')).toBe(true)
  })

  it('grows monotonically with percent', () => {
    const narrow = topPercentRange(10)
    const wide = topPercentRange(50)
    expect(wide.size).toBeGreaterThan(narrow.size)
    for (const hand of narrow) {
      expect(wide.has(hand)).toBe(true)
    }
  })
})
