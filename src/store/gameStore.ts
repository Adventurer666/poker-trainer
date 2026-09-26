import { create } from 'zustand'
import { PERSONAS } from '../personas/personas'
import { POSITIONS, type HandState, type Player } from '../types/poker'

function createSeats(): Player[] {
  const humanSeat = 0
  return POSITIONS.map((position, seat) => {
    if (seat === humanSeat) {
      return {
        id: 'human',
        kind: 'human',
        name: 'You',
        position,
        stack: 10000, // variable stack depth is set per-session at deal time
        seat,
        isFolded: false,
        isAllIn: false,
      } satisfies Player
    }
    const persona = PERSONAS[(seat - 1) % PERSONAS.length]
    return {
      id: `bot-${seat}`,
      kind: 'bot',
      name: persona.displayName,
      position,
      stack: 10000,
      seat,
      personaId: persona.id,
      isFolded: false,
      isAllIn: false,
    } satisfies Player
  })
}

interface GameStore {
  hand: HandState | null
  startNewHand: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  hand: null,
  startNewHand: () =>
    set({
      hand: {
        handId: crypto.randomUUID(),
        street: 'preflop',
        board: [],
        pot: 0,
        players: createSeats(),
        actionHistory: [],
        buttonSeat: 6, // BTN seat index, matches POSITIONS order
        toActPlayerId: null,
      },
    }),
}))
