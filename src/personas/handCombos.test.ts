import { describe, expect, it } from 'vitest'
import { cardFromString } from '../types/card'
import { anyComboForNotation, combosForNotation, flattenRangeToCombos } from './handCombos'

describe('combosForNotation', () => {
  it('has 6 combos for a pair with nothing dead', () => {
    expect(combosForNotation('AA', [])).toHaveLength(6)
  })

  it('has 4 combos for a suited hand with nothing dead', () => {
    expect(combosForNotation('AKs', [])).toHaveLength(4)
  })

  it('has 12 combos for an offsuit hand with nothing dead', () => {
    expect(combosForNotation('AKo', [])).toHaveLength(12)
  })

  it('excludes combos that use a dead card', () => {
    // One specific Ace is dead — every pair-combo using it should disappear.
    const combos = combosForNotation('AA', [cardFromString('As')])
    expect(combos).toHaveLength(3) // C(3,2) = 3 remaining aces
    expect(combos.some(([a, b]) => a.suit === 's' || b.suit === 's')).toBe(false)
  })

  it('returns nothing when every combo is blocked', () => {
    const dead = [cardFromString('As'), cardFromString('Ah'), cardFromString('Ad'), cardFromString('Ac')]
    expect(combosForNotation('AA', dead)).toHaveLength(0)
  })
})

describe('flattenRangeToCombos', () => {
  it('sums combos across every notation in the range', () => {
    const combos = flattenRangeToCombos(new Set(['AA', 'AKs']), [])
    expect(combos).toHaveLength(6 + 4)
  })
})

describe('anyComboForNotation', () => {
  it('returns a live combo when one exists', () => {
    expect(anyComboForNotation('AKo', [])).not.toBeNull()
  })

  it('returns null when fully blocked', () => {
    // AKs needs an Ace and a King of the same suit — block every Ace and King.
    const blockedAll = ['s', 'h', 'd', 'c'].flatMap((suit) => [
      cardFromString(`A${suit}`),
      cardFromString(`K${suit}`),
    ])
    expect(anyComboForNotation('AKs', blockedAll)).toBeNull()
  })
})
