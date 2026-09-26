import { describe, expect, it } from 'vitest'
import { calculateSidePots } from './sidePots'

describe('calculateSidePots', () => {
  it('returns a single main pot when no one is short-stacked', () => {
    const pots = calculateSidePots({ a: 100, b: 100, c: 100 }, new Set())
    expect(pots).toEqual([{ amount: 300, eligiblePlayerIds: ['a', 'b', 'c'] }])
  })

  it('splits into a main pot and a side pot for one short all-in', () => {
    // a is all-in for 50; b and c both put in 150.
    const pots = calculateSidePots({ a: 50, b: 150, c: 150 }, new Set())
    expect(pots).toEqual([
      { amount: 150, eligiblePlayerIds: ['a', 'b', 'c'] }, // 50 * 3
      { amount: 200, eligiblePlayerIds: ['b', 'c'] }, // 100 * 2
    ])
  })

  it('excludes folded players from eligibility but keeps their chips in the pot', () => {
    const pots = calculateSidePots({ a: 100, b: 100, c: 100 }, new Set(['b']))
    expect(pots).toEqual([{ amount: 300, eligiblePlayerIds: ['a', 'c'] }])
  })

  it('handles multiple short all-ins at different levels', () => {
    // a all-in 20, b all-in 60, c puts in 100.
    const pots = calculateSidePots({ a: 20, b: 60, c: 100 }, new Set())
    expect(pots).toEqual([
      { amount: 60, eligiblePlayerIds: ['a', 'b', 'c'] }, // 20 * 3
      { amount: 80, eligiblePlayerIds: ['b', 'c'] }, // 40 * 2
      { amount: 40, eligiblePlayerIds: ['c'] }, // 40 * 1
    ])
  })

  it('carries a layer forward when every payer of it folded', () => {
    // a all-in 100 and folds later (already contributed), b all-in 50 and folds,
    // c calls 100 and is the only one left standing.
    const pots = calculateSidePots({ a: 100, b: 50, c: 100 }, new Set(['a', 'b']))
    // Layer 0-50 (a,b,c pay -> all fold except c): carried forward.
    // Layer 50-100 (a,c pay -> a folds, only c eligible): gets the carry too.
    expect(pots).toEqual([{ amount: 250, eligiblePlayerIds: ['c'] }])
  })

  it('returns nothing for an empty pot', () => {
    expect(calculateSidePots({}, new Set())).toEqual([])
  })
})
