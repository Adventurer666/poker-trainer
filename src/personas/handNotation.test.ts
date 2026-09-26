import { describe, expect, it } from 'vitest'
import { cardFromString } from '../types/card'
import { handNotation } from './handNotation'

describe('handNotation', () => {
  it('formats a pair without a suffix', () => {
    expect(handNotation([cardFromString('Ah'), cardFromString('As')])).toBe('AA')
  })

  it('formats a suited hand high card first, with an "s"', () => {
    expect(handNotation([cardFromString('Ks'), cardFromString('As')])).toBe('AKs')
  })

  it('formats an offsuit hand high card first, with an "o"', () => {
    expect(handNotation([cardFromString('7h'), cardFromString('2c')])).toBe('72o')
  })
})
