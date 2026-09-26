import { create } from 'zustand'
import type { RangeMarks } from '../components/RangeGrid'

interface RangeTrackerStore {
  /** Which opponent's grid is currently open, if any. */
  openPlayerId: string | null
  /** Per-opponent marks for the CURRENT hand only — reset each new hand. */
  tracks: Record<string, RangeMarks>
  openTracker: (playerId: string) => void
  closeTracker: () => void
  cycleMark: (playerId: string, notation: string) => void
  resetForNewHand: () => void
}

export const useRangeTrackerStore = create<RangeTrackerStore>((set) => ({
  openPlayerId: null,
  tracks: {},

  openTracker: (playerId) => set({ openPlayerId: playerId }),
  closeTracker: () => set({ openPlayerId: null }),

  cycleMark: (playerId, notation) =>
    set((state) => {
      const current = state.tracks[playerId]?.[notation] ?? 0
      const next = ((current + 1) % 3) as 0 | 1 | 2
      return {
        tracks: {
          ...state.tracks,
          [playerId]: { ...state.tracks[playerId], [notation]: next },
        },
      }
    }),

  resetForNewHand: () => set({ tracks: {}, openPlayerId: null }),
}))
