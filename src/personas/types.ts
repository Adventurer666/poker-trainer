import type { Position } from '../types/poker'

export type PersonaId =
  | 'the-rock'
  | 'solid-reg'
  | 'maniac'
  | 'calling-station'
  | 'loose-fish'
  | 'nit-3bettor'
  | 'tricky-balanced'
  | 'straightforward-abc'

/**
 * A persona's preflop opening frequency by position, as a percentage of the
 * 169 starting hands (e.g. 12 = "opens the top 12% of hands from here").
 * Used with handRanking.topPercentRange() to build the actual ground-truth
 * range the app scores the user's read against.
 */
export type OpeningRangeByPosition = Record<Position, number>

export interface Tendencies {
  /** % of hands voluntarily played preflop (calls or raises). */
  vpip: number
  /** % of hands raised preflop. */
  pfr: number
  /** % of the time this player 3-bets rather than flats, when facing a raise. */
  threeBetFrequency: number
  /** % of flops continuation-bet after raising preflop. */
  cbetFrequency: number
  /** % of bets/raises that are bluffs rather than value, in spots with no clear made hand. */
  bluffFrequency: number
  /** % of the time this player check-raises rather than leads/calls, with a strong hand. */
  checkRaiseFrequency: number
  /** Relative bet sizing as a multiple of pot (0.5 = half-pot-ish, 1.2 = overbet-leaning). */
  sizingTendency: number
}

export interface ThinkTimeProfile {
  /** Milliseconds for a trivial decision (e.g. folding to an all-in with air). */
  minMs: number
  /** Milliseconds for a genuinely close decision. */
  maxMs: number
  /** If true, this persona sometimes snap-acts even on big decisions (a soft tell). */
  usesSnapDecisionsAsBluffTell: boolean
}

export interface Persona {
  id: PersonaId
  displayName: string
  /** One-line description shown in post-session review, not during play. */
  description: string
  openingRangeByPosition: OpeningRangeByPosition
  tendencies: Tendencies
  thinkTime: ThinkTimeProfile
}
