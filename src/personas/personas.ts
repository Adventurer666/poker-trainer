import { POSITIONS, type Position } from '../types/poker'
import type { OpeningRangeByPosition, Persona } from './types'

/**
 * Standard positional looseness curve, relative to a HJ "base" value.
 * Later positions open wider (less risk of being re-raised by many players
 * behind), so a persona's overall tightness/looseness is set by `base` and
 * this curve just distributes it realistically across the table.
 */
const POSITION_MULTIPLIER: Record<Position, number> = {
  UTG: 0.55,
  UTG1: 0.65,
  MP: 0.78,
  MP1: 0.88,
  HJ: 1.0,
  CO: 1.3,
  BTN: 1.65,
  SB: 1.15,
  BB: 1.05,
}

function positionalRange(basePercent: number): OpeningRangeByPosition {
  const entries = POSITIONS.map((position) => {
    const value = Math.min(100, Math.max(1, Math.round(basePercent * POSITION_MULTIPLIER[position])))
    return [position, value] as const
  })
  return Object.fromEntries(entries) as OpeningRangeByPosition
}

export const PERSONAS: Persona[] = [
  {
    id: 'the-rock',
    displayName: 'The Rock',
    description: 'Extremely tight-passive. Plays premiums only, rarely bluffs.',
    openingRangeByPosition: positionalRange(8),
    tendencies: {
      vpip: 12,
      pfr: 8,
      threeBetFrequency: 4,
      cbetFrequency: 45,
      bluffFrequency: 5,
      checkRaiseFrequency: 8,
      sizingTendency: 0.6,
    },
    thinkTime: { minMs: 800, maxMs: 4000, usesSnapDecisionsAsBluffTell: false },
  },
  {
    id: 'solid-reg',
    displayName: 'Solid Reg',
    description: 'Tight-aggressive. Balanced, disciplined, the "textbook" player.',
    openingRangeByPosition: positionalRange(18),
    tendencies: {
      vpip: 22,
      pfr: 18,
      threeBetFrequency: 9,
      cbetFrequency: 65,
      bluffFrequency: 25,
      checkRaiseFrequency: 12,
      sizingTendency: 0.75,
    },
    thinkTime: { minMs: 600, maxMs: 6000, usesSnapDecisionsAsBluffTell: false },
  },
  {
    id: 'maniac',
    displayName: 'The Maniac',
    description: 'Loose-aggressive to a fault. Raises and re-raises constantly.',
    openingRangeByPosition: positionalRange(45),
    tendencies: {
      vpip: 55,
      pfr: 48,
      threeBetFrequency: 22,
      cbetFrequency: 80,
      bluffFrequency: 45,
      checkRaiseFrequency: 25,
      sizingTendency: 1.15,
    },
    thinkTime: { minMs: 300, maxMs: 2500, usesSnapDecisionsAsBluffTell: true },
  },
  {
    id: 'calling-station',
    displayName: 'Calling Station',
    description: 'Loose-passive. Plays too many hands, rarely raises, rarely folds.',
    openingRangeByPosition: positionalRange(38),
    tendencies: {
      vpip: 48,
      pfr: 10,
      threeBetFrequency: 2,
      cbetFrequency: 35,
      bluffFrequency: 5,
      checkRaiseFrequency: 4,
      sizingTendency: 0.55,
    },
    thinkTime: { minMs: 500, maxMs: 3500, usesSnapDecisionsAsBluffTell: false },
  },
  {
    id: 'loose-fish',
    displayName: 'Loose Fish',
    description: 'Plays far too wide with no clear plan; unpredictable postflop.',
    openingRangeByPosition: positionalRange(42),
    tendencies: {
      vpip: 50,
      pfr: 22,
      threeBetFrequency: 6,
      cbetFrequency: 50,
      bluffFrequency: 30,
      checkRaiseFrequency: 10,
      sizingTendency: 0.9,
    },
    thinkTime: { minMs: 700, maxMs: 5000, usesSnapDecisionsAsBluffTell: false },
  },
  {
    id: 'nit-3bettor',
    displayName: 'Nitty 3-Bettor',
    description: 'Very tight overall, but 3-bets nearly everything in its narrow range.',
    openingRangeByPosition: positionalRange(10),
    tendencies: {
      vpip: 14,
      pfr: 13,
      threeBetFrequency: 11,
      cbetFrequency: 70,
      bluffFrequency: 8,
      checkRaiseFrequency: 15,
      sizingTendency: 0.85,
    },
    thinkTime: { minMs: 500, maxMs: 3000, usesSnapDecisionsAsBluffTell: false },
  },
  {
    id: 'tricky-balanced',
    displayName: 'Tricky Balanced',
    description: 'Deliberately unpredictable — mixes strategies to avoid being read.',
    openingRangeByPosition: positionalRange(24),
    tendencies: {
      vpip: 26,
      pfr: 20,
      threeBetFrequency: 10,
      cbetFrequency: 60,
      bluffFrequency: 35,
      checkRaiseFrequency: 18,
      sizingTendency: 0.95,
    },
    thinkTime: { minMs: 900, maxMs: 7000, usesSnapDecisionsAsBluffTell: true },
  },
  {
    id: 'straightforward-abc',
    displayName: 'Straightforward ABC',
    description: 'Plays "textbook" hand-strength poker with almost no deception.',
    openingRangeByPosition: positionalRange(16),
    tendencies: {
      vpip: 19,
      pfr: 16,
      threeBetFrequency: 6,
      cbetFrequency: 55,
      bluffFrequency: 10,
      checkRaiseFrequency: 6,
      sizingTendency: 0.7,
    },
    thinkTime: { minMs: 600, maxMs: 4500, usesSnapDecisionsAsBluffTell: false },
  },
]

export function getPersona(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id)
}
