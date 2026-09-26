import { describe, expect, it } from 'vitest'
import { cardFromString } from '../types/card'
import { estimateEquityVsRange } from './equitySimulator'

// A fixed-sequence PRNG so these are deterministic instead of flaky.
function seededRng(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

describe('estimateEquityVsRange', () => {
  it('gives a huge favorite (AA vs a single weak hand) very high equity', () => {
    const equity = estimateEquityVsRange(
      [cardFromString('As'), cardFromString('Ah')],
      [],
      new Set(['72o']),
      { trials: 400, rng: seededRng(1) },
    )
    expect(equity).toBeGreaterThan(0.75)
  })

  it('gives a huge underdog (72o vs a single premium hand) very low equity', () => {
    const equity = estimateEquityVsRange(
      [cardFromString('7d'), cardFromString('2c')],
      [],
      new Set(['AA']),
      { trials: 400, rng: seededRng(2) },
    )
    expect(equity).toBeLessThan(0.25)
  })

  it('puts a classic coinflip (AKo vs QQ) roughly in coinflip territory', () => {
    const equity = estimateEquityVsRange(
      [cardFromString('As'), cardFromString('Kd')],
      [],
      new Set(['QQ']),
      { trials: 800, rng: seededRng(3) },
    )
    expect(equity).toBeGreaterThan(0.3)
    expect(equity).toBeLessThan(0.6)
  })

  it('gives a made flush very high equity against a range that mostly misses the board', () => {
    const board = [cardFromString('2h'), cardFromString('9h'), cardFromString('Kc'), cardFromString('4h')]
    const equity = estimateEquityVsRange(
      [cardFromString('Ah'), cardFromString('Th')], // nut flush already made
      board,
      new Set(['QQ', 'JJ', 'TT']), // no flush, no board pair
      { trials: 400, rng: seededRng(4) },
    )
    expect(equity).toBeGreaterThan(0.85)
  })

  it('returns 0.5 when the range has no live combos left (fully card-removed)', () => {
    // Hero holds 2 aces and the board shows a 3rd — only one ace is left in
    // the deck, so "AA" (which needs 2) has zero live combos.
    const board = [cardFromString('Ad'), cardFromString('2c'), cardFromString('3d')]
    const equity = estimateEquityVsRange(
      [cardFromString('As'), cardFromString('Ah')],
      board,
      new Set(['AA']),
      { trials: 100, rng: seededRng(5) },
    )
    expect(equity).toBe(0.5)
  })
})
