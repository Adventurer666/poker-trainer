import { describe, expect, it } from 'vitest'
import { topPercentRange } from './handRanking'
import { getPersona, PERSONAS } from './personas'

describe('PERSONAS', () => {
  it('defines exactly 8 unique personas', () => {
    expect(PERSONAS).toHaveLength(8)
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(8)
  })

  it('opens wider on the button than under the gun, for every persona', () => {
    for (const persona of PERSONAS) {
      expect(persona.openingRangeByPosition.BTN).toBeGreaterThan(
        persona.openingRangeByPosition.UTG,
      )
    }
  })

  it('produces a usable ground-truth range for each position', () => {
    const persona = getPersona('solid-reg')!
    const range = topPercentRange(persona.openingRangeByPosition.BTN)
    expect(range.size).toBeGreaterThan(0)
    expect(range.has('AA')).toBe(true)
  })
})

describe('getPersona', () => {
  it('returns undefined for an unknown id', () => {
    expect(getPersona('nope')).toBeUndefined()
  })
})
