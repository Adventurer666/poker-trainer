import { describe, expect, it } from 'vitest'
import { assignBotNames } from './botNames'

describe('assignBotNames', () => {
  it('returns the requested count of distinct names', () => {
    const names = assignBotNames(8, () => 0.5)
    expect(names).toHaveLength(8)
    expect(new Set(names).size).toBe(8)
  })

  it('throws if more names are requested than exist in the pool', () => {
    expect(() => assignBotNames(999)).toThrow()
  })
})
