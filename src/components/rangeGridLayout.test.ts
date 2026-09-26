import { describe, expect, it } from 'vitest'
import { allStartingHands } from '../personas/handRanking'
import { rangeGridLayout } from './rangeGridLayout'

describe('rangeGridLayout', () => {
  it('is a 13x13 grid', () => {
    const grid = rangeGridLayout()
    expect(grid).toHaveLength(13)
    for (const row of grid) expect(row).toHaveLength(13)
  })

  it('contains every one of the 169 canonical hands exactly once', () => {
    const grid = rangeGridLayout()
    const flat = grid.flat()
    expect(flat).toHaveLength(169)
    expect(new Set(flat)).toEqual(new Set(allStartingHands()))
  })

  it('puts pairs on the diagonal', () => {
    const grid = rangeGridLayout()
    expect(grid[0][0]).toBe('AA')
    expect(grid[12][12]).toBe('22')
  })

  it('puts AKs above the diagonal and AKo below it', () => {
    const grid = rangeGridLayout()
    expect(grid[0][1]).toBe('AKs')
    expect(grid[1][0]).toBe('AKo')
  })
})
