import { useEffect, useState } from 'react'
import { legalActions } from '../engine/bettingEngine'
import { HUMAN_ID, useGameStore } from '../store/gameStore'
import { useRangeTrackerStore } from '../store/rangeTrackerStore'
import { CardView } from './CardView'
import { ChipStack } from './ChipStack'
import { PlayerPod } from './PlayerPod'
import { RangeComparison } from './RangeComparison'
import { RangeGrid } from './RangeGrid'
import { betPosition, seatPosition } from './seatLayout'

function formatChips(n: number): string {
  return n.toLocaleString('en-US')
}

export function Table() {
  const hand = useGameStore((s) => s.hand)
  const startNewHand = useGameStore((s) => s.startNewHand)
  const performHumanAction = useGameStore((s) => s.performHumanAction)
  const [raiseTo, setRaiseTo] = useState<number | null>(null)
  const openPlayerId = useRangeTrackerStore((s) => s.openPlayerId)
  const tracks = useRangeTrackerStore((s) => s.tracks)
  const openTracker = useRangeTrackerStore((s) => s.openTracker)
  const closeTracker = useRangeTrackerStore((s) => s.closeTracker)
  const cycleMark = useRangeTrackerStore((s) => s.cycleMark)

  // Which opponent's "Track range / Reveal cards" menu is open, if any.
  const [menuPlayerId, setMenuPlayerId] = useState<string | null>(null)
  // The confirm-then-reveal flow for peeking at a specific opponent's cards.
  const [revealState, setRevealState] = useState<{ playerId: string; step: 'confirm' | 'shown' } | null>(null)

  // A fresh hand should never carry over an open menu or a card reveal from the last one.
  useEffect(() => {
    setMenuPlayerId(null)
    setRevealState(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hand?.handId])

  if (!hand) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-10 text-center">
        <h1 className="text-lg font-medium text-neutral-100">Poker Trainer</h1>
        <p className="text-sm text-neutral-400">9-handed, 8 AI opponents, variable stacks.</p>
        <button
          onClick={startNewHand}
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-white"
        >
          Start Hand
        </button>
      </div>
    )
  }

  const humanTurn = hand.toActPlayerId === HUMAN_ID
  const legal = humanTurn ? legalActions(hand, HUMAN_ID) : null
  const totalSeats = hand.players.length

  function act(type: 'fold' | 'check' | 'call' | 'all-in') {
    performHumanAction({ type })
    setRaiseTo(null)
  }

  function actRaise() {
    if (!legal) return
    performHumanAction({
      type: legal.types.includes('bet') ? 'bet' : 'raise',
      amount: raiseTo ?? legal.minRaiseTo,
    })
    setRaiseTo(null)
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-neutral-100">Poker Trainer</h1>
        <span className="text-sm capitalize text-neutral-400">{hand.street}</span>
      </header>

      {/* The table itself */}
      <div
        className="relative mx-auto aspect-[16/11] w-full max-w-3xl rounded-[50%] border-[10px] border-neutral-800 shadow-2xl"
        style={{
          background:
            'radial-gradient(ellipse at center, #0f3d2e 0%, #0a2e22 60%, #0a2018 100%)',
        }}
      >
        {/* Center: pot + board */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
          <div className="rounded-full border border-emerald-900/60 bg-black/30 px-3 py-1 text-xs text-emerald-200">
            Pot: {formatChips(hand.pot)}
          </div>
          <div className="flex gap-1">
            {hand.board.map((card, i) => (
              <CardView key={i} card={card} />
            ))}
          </div>
        </div>

        {/* Seats */}
        {hand.players.map((player) => {
          const { left, top } = seatPosition(player.seat, totalSeats)
          const isHuman = player.id === HUMAN_ID
          const showCards =
            isHuman ||
            (hand.isHandComplete && !player.isFolded && hand.results[0]?.wonUncontested !== true)
          return (
            <div
              key={player.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left, top }}
            >
              <PlayerPod
                player={player}
                isToAct={hand.toActPlayerId === player.id}
                isButton={hand.buttonSeat === player.seat}
                showCards={showCards}
                isHuman={isHuman}
                onClick={isHuman ? undefined : () => setMenuPlayerId(player.id)}
              />
            </div>
          )
        })}

        {/* Bet chips: shown between each player and the pot, not on the pod itself */}
        {hand.players.map((player) => {
          const amount = hand.streetContributions[player.id] ?? 0
          if (amount <= 0 || player.isFolded) return null
          const { left, top } = betPosition(player.seat, totalSeats)
          return (
            <div
              key={`bet-${player.id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left, top }}
            >
              <ChipStack amount={amount} />
            </div>
          )
        })}
      </div>

      {hand.isHandComplete ? (
        <>
          <section className="flex flex-col items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-sm text-neutral-200">
              {hand.results
                .map((r) => `${hand.players.find((p) => p.id === r.playerId)?.name} wins ${formatChips(r.amountWon)}`)
                .join(', ')}
            </p>
            <button
              onClick={startNewHand}
              className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-white"
            >
              Next Hand
            </button>
          </section>
          <RangeComparison hand={hand} tracks={tracks} />
        </>
      ) : humanTurn && legal ? (
        <section className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          {legal.types.includes('fold') && (
            <button
              onClick={() => act('fold')}
              className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
            >
              Fold
            </button>
          )}
          {legal.types.includes('check') && (
            <button
              onClick={() => act('check')}
              className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
            >
              Check
            </button>
          )}
          {legal.types.includes('call') && (
            <button
              onClick={() => act('call')}
              className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
            >
              Call {formatChips(legal.callAmount)}
            </button>
          )}
          {(legal.types.includes('bet') || legal.types.includes('raise')) && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={legal.minRaiseTo}
                max={legal.maxRaiseTo}
                value={raiseTo ?? legal.minRaiseTo}
                onChange={(e) => setRaiseTo(Number(e.target.value))}
                className="w-24 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm text-neutral-100"
              />
              <button
                onClick={actRaise}
                className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
              >
                {legal.types.includes('bet') ? 'Bet' : 'Raise'}
              </button>
            </div>
          )}
          {legal.types.includes('all-in') && (
            <button
              onClick={() => act('all-in')}
              className="rounded-md border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950"
            >
              All-in
            </button>
          )}
        </section>
      ) : (
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-500">
          {hand.players.find((p) => p.id === hand.toActPlayerId)?.name ?? 'Someone'} is thinking…
        </section>
      )}

      <section className="max-h-32 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-500">
        {hand.actionHistory
          .slice()
          .reverse()
          .map((a, i) => {
            const name = hand.players.find((p) => p.id === a.playerId)?.name ?? a.playerId
            return (
              <div key={i}>
                {name} {a.type}
                {a.amount > 0 ? ` ${formatChips(a.amount)}` : ''}{' '}
                <span className="text-neutral-700">({a.street})</span>
              </div>
            )
          })}
      </section>

      {menuPlayerId && (() => {
        const menuPlayer = hand.players.find((p) => p.id === menuPlayerId)
        if (!menuPlayer) return null
        const close = () => setMenuPlayerId(null)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={close}>
            <div
              className="flex w-56 flex-col gap-2 rounded-lg border border-neutral-700 bg-neutral-900 p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="px-1 text-sm font-medium text-neutral-200">{menuPlayer.name}</h2>
              <button
                onClick={() => {
                  close()
                  openTracker(menuPlayer.id)
                }}
                className="rounded-md border border-neutral-700 px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
              >
                Track range
              </button>
              <button
                onClick={() => {
                  close()
                  setRevealState({ playerId: menuPlayer.id, step: 'confirm' })
                }}
                className="rounded-md border border-neutral-700 px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
              >
                Reveal cards
              </button>
              <button
                onClick={close}
                className="rounded-md px-3 py-2 text-left text-xs text-neutral-500 hover:text-neutral-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      })()}

      {revealState && (() => {
        const revealPlayer = hand.players.find((p) => p.id === revealState.playerId)
        if (!revealPlayer) return null
        const cancel = () => setRevealState(null)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={cancel}>
            <div
              className="flex max-w-xs flex-col items-center gap-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {revealState.step === 'confirm' ? (
                <>
                  <p className="text-sm text-neutral-200">
                    Reveal {revealPlayer.name}&apos;s cards? This skips reading them from their actions.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={cancel}
                      className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setRevealState({ playerId: revealPlayer.id, step: 'shown' })}
                      className="rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-white"
                    >
                      Yes, show me
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-neutral-200">{revealPlayer.name}&apos;s cards</p>
                  <div className="flex gap-1">
                    {revealPlayer.holeCards?.map((card, i) => <CardView key={i} card={card} />)}
                  </div>
                  <button
                    onClick={cancel}
                    className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {openPlayerId && (() => {
        const trackedPlayer = hand.players.find((p) => p.id === openPlayerId)
        if (!trackedPlayer) return null
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={closeTracker}
          >
            <div
              className="flex max-w-full flex-col items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-900 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex w-full items-center justify-between gap-6">
                <h2 className="text-sm font-medium text-neutral-200">
                  {trackedPlayer.name}&apos;s range — tap a hand to mark it
                </h2>
                <button
                  onClick={closeTracker}
                  className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                >
                  Done
                </button>
              </div>
              <p className="text-[10px] text-neutral-500">Tap once for possible, twice for likely, again to clear.</p>
              <RangeGrid
                marks={tracks[openPlayerId] ?? {}}
                onCellClick={(notation) => cycleMark(openPlayerId, notation)}
              />
            </div>
          </div>
        )
      })()}
    </div>
  )
}
