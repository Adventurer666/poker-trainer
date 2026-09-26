import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

/**
 * Minimal, clean table view — deliberately not a "realistic casino" skin
 * per the PRD's visual style decision. One seat per position, laid out in
 * a simple oval. Placeholder for now: no betting UI yet, just seating,
 * stacks, and persona labels (visible here for development only — the
 * real app hides persona identity from the player during play).
 */
export function Table() {
  const hand = useGameStore((s) => s.hand)
  const startNewHand = useGameStore((s) => s.startNewHand)

  useEffect(() => {
    if (!hand) startNewHand()
  }, [hand, startNewHand])

  if (!hand) return null

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 p-6">
      <h1 className="text-lg font-medium text-neutral-100">Poker Trainer</h1>
      <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-3">
        {hand.players.map((player) => (
          <div
            key={player.id}
            className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-200"
          >
            <div className="font-medium">{player.name}</div>
            <div className="text-neutral-400">{player.position}</div>
            <div className="text-neutral-400">{player.stack} chips</div>
          </div>
        ))}
      </div>
    </div>
  )
}
