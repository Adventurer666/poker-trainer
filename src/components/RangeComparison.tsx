import { useState } from 'react'
import { allStartingHands } from '../personas/handRanking'
import { getPersona } from '../personas/personas'
import { classifyPreflopAction, groundTruthRangeForPlayer } from '../personas/rangeModel'
import type { HandState } from '../types/poker'
import { RangeGrid, type RangeMarks } from './RangeGrid'

const ALL_HANDS = allStartingHands()

interface RangeComparisonProps {
  hand: HandState
  tracks: Record<string, RangeMarks>
}

const CLASSIFICATION_LABEL: Record<string, string> = {
  open: 'opened',
  continue: 'called/continued',
  'three-bet': '3-bet',
  folded: 'folded preflop',
}

function scoreFor(marks: RangeMarks, groundTruth: Set<string>, allHands: string[]): number {
  let correct = 0
  for (const notation of allHands) {
    const marked = (marks[notation] ?? 0) > 0
    const actual = groundTruth.has(notation)
    if (marked === actual) correct++
  }
  return Math.round((correct / allHands.length) * 100)
}

export function RangeComparison({ hand, tracks }: RangeComparisonProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const trackedOpponents = hand.players.filter(
    (p) => p.kind === 'bot' && p.personaId && (tracks[p.id] && Object.keys(tracks[p.id]).length > 0),
  )

  if (trackedOpponents.length === 0) return null

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="text-sm font-medium text-neutral-200">Range check</h2>
      <div className="flex flex-col gap-2">
        {trackedOpponents.map((player) => {
          const persona = getPersona(player.personaId!)
          if (!persona) return null
          const groundTruth = groundTruthRangeForPlayer(hand, player.id, persona)
          const classification = classifyPreflopAction(hand, player.id)
          const marks = tracks[player.id] ?? {}
          const isOpen = expandedId === player.id
          const score = scoreFor(marks, groundTruth, ALL_HANDS)

          return (
            <div key={player.id} className="rounded-md border border-neutral-800 bg-neutral-950 p-2">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : player.id)}
                className="flex w-full items-center justify-between text-left text-xs text-neutral-300"
              >
                <span>
                  {player.name} <span className="text-neutral-500">({CLASSIFICATION_LABEL[classification]})</span>
                </span>
                <span className="flex items-center gap-2 text-neutral-500">
                  <span className="text-neutral-600">{score}% match</span>
                  {isOpen ? 'Hide' : 'Show'}
                </span>
              </button>

              {isOpen && (
                <div className="mt-2 flex flex-col items-start gap-2">
                  <p className="text-[10px] leading-snug text-neutral-500">
                    Green = you had it marked and they were in this range. Amber = in their range but you
                    missed it. Red = you marked it but they weren&apos;t actually representing it.
                  </p>
                  <RangeGrid marks={marks} groundTruth={groundTruth} compact />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
