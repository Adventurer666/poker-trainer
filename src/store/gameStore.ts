import { create } from 'zustand'
import { applyAction, createHand, type ActionInput } from '../engine/bettingEngine'
import { createDeck, shuffleDeck } from '../engine/deck'
import { nextButtonSeat } from '../engine/positions'
import { decideBotAction } from '../personas/botDecision'
import { getPersona, PERSONAS } from '../personas/personas'
import { POSITIONS, type BlindsConfig, type HandState, type Player } from '../types/poker'

export const HUMAN_ID = 'human'
const STARTING_STACK = 10000
const BLINDS: BlindsConfig = { smallBlind: 50, bigBlind: 100 }
const NUM_SEATS = POSITIONS.length

function initialPlayers(): Player[] {
  return POSITIONS.map((position, seat) => {
    if (seat === 0) {
      return {
        id: HUMAN_ID,
        kind: 'human',
        name: 'You',
        position,
        stack: STARTING_STACK,
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
      stack: STARTING_STACK,
      seat,
      personaId: persona.id,
      isFolded: false,
      isAllIn: false,
    } satisfies Player
  })
}

interface GameStore {
  seatedPlayers: Player[]
  buttonSeat: number
  hand: HandState | null
  startNewHand: () => void
  performHumanAction: (input: ActionInput) => void
}

// Module-level (not store state) since it's an implementation detail of the
// auto-play loop, not something components should read or render from.
let botTurnTimer: ReturnType<typeof setTimeout> | null = null

export const useGameStore = create<GameStore>((set, get) => {
  function scheduleBotTurnIfNeeded() {
    if (botTurnTimer) clearTimeout(botTurnTimer)
    const hand = get().hand
    if (!hand || hand.isHandComplete || !hand.toActPlayerId) return

    const player = hand.players.find((p) => p.id === hand.toActPlayerId)
    if (!player || player.kind !== 'bot') return

    const persona = getPersona(player.personaId!)
    if (!persona) return
    const decision = decideBotAction(hand, player.id, persona)

    botTurnTimer = setTimeout(() => {
      const current = get().hand
      // Guard against a new hand having started (or state otherwise moved
      // on) while this bot was "thinking".
      if (!current || current.toActPlayerId !== player.id) return
      const updated = applyAction(current, player.id, decision.action, decision.thinkTimeMs)
      set({ hand: updated })
      scheduleBotTurnIfNeeded()
    }, decision.thinkTimeMs)
  }

  return {
    seatedPlayers: initialPlayers(),
    buttonSeat: 6,
    hand: null,

    startNewHand: () => {
      const { seatedPlayers, buttonSeat, hand: previousHand } = get()

      const carriedPlayers = previousHand
        ? seatedPlayers.map((p) => {
            const asOfLastHand = previousHand.players.find((hp) => hp.id === p.id)
            return {
              ...p,
              stack: asOfLastHand ? asOfLastHand.stack : p.stack,
              isFolded: false,
              isAllIn: false,
              holeCards: undefined,
            }
          })
        : seatedPlayers

      const nextButton = previousHand ? nextButtonSeat(buttonSeat, NUM_SEATS) : buttonSeat
      const deck = shuffleDeck(createDeck())
      const hand = createHand(crypto.randomUUID(), carriedPlayers, nextButton, BLINDS, deck)

      set({ seatedPlayers: carriedPlayers, buttonSeat: nextButton, hand })
      scheduleBotTurnIfNeeded()
    },

    performHumanAction: (input) => {
      const hand = get().hand
      if (!hand || hand.toActPlayerId !== HUMAN_ID) return
      const updated = applyAction(hand, HUMAN_ID, input)
      set({ hand: updated })
      scheduleBotTurnIfNeeded()
    },
  }
})
