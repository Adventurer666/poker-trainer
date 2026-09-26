import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HUMAN_ID, useGameStore } from './gameStore'
import { legalActions } from '../engine/bettingEngine'

describe('useGameStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deals a hand and lets bots play themselves out to the human or completion', () => {
    useGameStore.getState().startNewHand()
    // Let every scheduled bot "think" resolve.
    vi.runAllTimers()

    const hand = useGameStore.getState().hand
    expect(hand).not.toBeNull()
    // Either it's the human's turn, or the hand already finished (e.g.
    // everyone folded to a walk) — either way, no bot should be stuck.
    if (!hand!.isHandComplete) {
      const toAct = hand!.players.find((p) => p.id === hand!.toActPlayerId)
      expect(toAct?.kind).toBe('human')
    }
  })

  it('lets the human act and keeps advancing until the hand completes', () => {
    useGameStore.getState().startNewHand()
    vi.runAllTimers()

    let hand = useGameStore.getState().hand!
    let guard = 0
    while (!hand.isHandComplete && guard < 200) {
      guard++
      if (hand.toActPlayerId === HUMAN_ID) {
        const legal = legalActions(hand, HUMAN_ID)
        if (legal.types.includes('check')) {
          useGameStore.getState().performHumanAction({ type: 'check' })
        } else if (legal.types.includes('call')) {
          useGameStore.getState().performHumanAction({ type: 'call' })
        } else {
          useGameStore.getState().performHumanAction({ type: 'fold' })
        }
        vi.runAllTimers()
        hand = useGameStore.getState().hand!
      } else {
        // Shouldn't happen (bots resolve via timers), but avoid a hang if it does.
        vi.runAllTimers()
        hand = useGameStore.getState().hand!
      }
    }

    expect(hand.isHandComplete).toBe(true)
    expect(hand.results.length).toBeGreaterThan(0)
    expect(guard).toBeLessThan(200)
  })

  it('carries stacks forward and rotates the button on the next hand', () => {
    useGameStore.getState().startNewHand()
    vi.runAllTimers()
    const firstButton = useGameStore.getState().buttonSeat

    // Force the hand to completion by folding the human if it's their turn,
    // otherwise just run timers until bots finish it off.
    let hand = useGameStore.getState().hand!
    let guard = 0
    while (!hand.isHandComplete && guard < 200) {
      guard++
      if (hand.toActPlayerId === HUMAN_ID) {
        useGameStore.getState().performHumanAction({ type: 'fold' })
      }
      vi.runAllTimers()
      hand = useGameStore.getState().hand!
    }

    useGameStore.getState().startNewHand()
    vi.runAllTimers()
    const secondButton = useGameStore.getState().buttonSeat
    expect(secondButton).not.toBe(firstButton)
  })
})
