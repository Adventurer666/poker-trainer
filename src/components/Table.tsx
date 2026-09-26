import { useState } from 'react'
import { legalActions } from '../engine/bettingEngine'
import { HUMAN_ID, useGameStore } from '../store/gameStore'
import { CardBack, CardView } from './CardView'

function formatChips(n: number): string {
  return n.toLocaleString('en-US')
}

export function Table() {
  const hand = useGameStore((s) => s.hand)
  const startNewHand = useGameStore((s) => s.startNewHand)
  const performHumanAction = useGameStore((s) => s.performHumanAction)
  const [raiseTo, setRaiseTo] = useState<number | null>(null)

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
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-neutral-100">Poker Trainer</h1>
        <span className="text-sm capitalize text-neutral-400">{hand.street}</span>
      </header>

      <section className="flex flex-col items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <div className="text-sm text-neutral-400">Pot: {formatChips(hand.pot)}</div>
        <div className="flex gap-2">
          {hand.board.map((card, i) => (
            <CardView key={i} card={card} />
          ))}
          {hand.board.length === 0 && <span className="text-xs text-neutral-600">No community cards yet</span>}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        {hand.players.map((player) => {
          const isToAct = hand.toActPlayerId === player.id
          const showCards =
            player.id === HUMAN_ID ||
            (hand.isHandComplete && !player.isFolded && hand.results[0]?.wonUncontested !== true)
          return (
            <div
              key={player.id}
              className={`rounded-lg border p-3 text-sm ${
                isToAct ? 'border-neutral-400 bg-neutral-800' : 'border-neutral-800 bg-neutral-900'
              } ${player.isFolded ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between text-neutral-200">
                <span className="font-medium">{player.name}</span>
                <span className="text-xs text-neutral-500">{player.position}</span>
              </div>
              <div className="mt-1 text-neutral-400">{formatChips(player.stack)} chips</div>
              <div className="mt-1 text-xs text-neutral-500">
                Bet: {formatChips(hand.streetContributions[player.id] ?? 0)}
                {player.isAllIn ? ' · all-in' : ''}
                {player.isFolded ? ' · folded' : ''}
              </div>
              <div className="mt-2 flex gap-1">
                {player.holeCards?.map((card, i) =>
                  showCards ? <CardView key={i} card={card} /> : <CardBack key={i} />,
                )}
              </div>
            </div>
          )
        })}
      </section>

      {hand.isHandComplete ? (
        <section className="flex flex-col items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-sm text-neutral-200">
            {hand.results.map((r) => `${hand.players.find((p) => p.id === r.playerId)?.name} wins ${formatChips(r.amountWon)}`).join(', ')}
          </p>
          <button
            onClick={startNewHand}
            className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-white"
          >
            Next Hand
          </button>
        </section>
      ) : humanTurn && legal ? (
        <section className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          {legal.types.includes('fold') && (
            <button onClick={() => act('fold')} className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800">
              Fold
            </button>
          )}
          {legal.types.includes('check') && (
            <button onClick={() => act('check')} className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800">
              Check
            </button>
          )}
          {legal.types.includes('call') && (
            <button onClick={() => act('call')} className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800">
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
              <button onClick={actRaise} className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800">
                {legal.types.includes('bet') ? 'Bet' : 'Raise'}
              </button>
            </div>
          )}
          {legal.types.includes('all-in') && (
            <button onClick={() => act('all-in')} className="rounded-md border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950">
              All-in
            </button>
          )}
        </section>
      ) : (
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-500">
          {hand.players.find((p) => p.id === hand.toActPlayerId)?.name ?? 'Someone'} is thinking…
        </section>
      )}

      <section className="max-h-40 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-500">
        {hand.actionHistory
          .slice()
          .reverse()
          .map((a, i) => {
            const name = hand.players.find((p) => p.id === a.playerId)?.name ?? a.playerId
            return (
              <div key={i}>
                {name} {a.type}
                {a.amount > 0 ? ` ${formatChips(a.amount)}` : ''} <span className="text-neutral-700">({a.street})</span>
              </div>
            )
          })}
      </section>
    </div>
  )
}
