import type { Card } from './card'

/** Standard 9-handed full-ring positions, in acting order preflop. */
export const POSITIONS = [
  'UTG',
  'UTG1',
  'MP',
  'MP1',
  'HJ',
  'CO',
  'BTN',
  'SB',
  'BB',
] as const
export type Position = (typeof POSITIONS)[number]

export const STREETS = ['preflop', 'flop', 'turn', 'river', 'showdown'] as const
export type Street = (typeof STREETS)[number]

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'

export interface PlayerAction {
  playerId: string
  street: Street
  type: ActionType
  /** Total chips put in with this action (0 for fold/check). */
  amount: number
  /** How long the bot "thought" before acting, in milliseconds — see Persona think-time. */
  thinkTimeMs: number
}

export type PlayerKind = 'human' | 'bot'

export interface Player {
  id: string
  kind: PlayerKind
  name: string
  position: Position
  stack: number
  seat: number // 0-8, table seating order
  personaId?: string // set for bots; ground truth for scoring
  isFolded: boolean
  isAllIn: boolean
  holeCards?: Card[] // hidden for bots until showdown/reveal
}

export interface BlindsConfig {
  smallBlind: number
  bigBlind: number
}

export interface HandResult {
  playerId: string
  amountWon: number
  /** true when everyone else folded — no cards are shown. */
  wonUncontested: boolean
}

export interface HandState {
  handId: string
  street: Street
  board: Card[]
  pot: number
  players: Player[]
  actionHistory: PlayerAction[]
  buttonSeat: number
  toActPlayerId: string | null
  blinds: BlindsConfig
  /** Cards not yet dealt to any hand or the board. */
  deck: Card[]
  /** Highest total contribution any player has made on the current street. */
  currentBet: number
  /** Minimum legal raise increment on top of currentBet. */
  minRaiseAmount: number
  /** Each player's contribution on the current street only (resets each street). */
  streetContributions: Record<string, number>
  /** Each player's contribution across the whole hand (for side-pot math). */
  totalContributions: Record<string, number>
  /** Player ids who have acted at least once since the last bet/raise this street. */
  actedThisStreet: string[]
  isHandComplete: boolean
  results: HandResult[]
}
