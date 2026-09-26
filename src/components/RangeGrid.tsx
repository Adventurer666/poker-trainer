import { rangeGridLayout } from './rangeGridLayout'

export type RangeMarks = Record<string, 0 | 1 | 2>

interface RangeGridProps {
  /** Live tracking mode: the player's own marks (0=out, 1=possible, 2=likely), tap to cycle. */
  marks?: RangeMarks
  onCellClick?: (notation: string) => void
  /** Comparison mode: the persona's actual range for this hand — overrides live-mode coloring. */
  groundTruth?: Set<string>
  compact?: boolean
}

const LIVE_COLORS: Record<0 | 1 | 2, string> = {
  0: 'bg-neutral-800 text-neutral-500',
  1: 'bg-amber-800/70 text-amber-100',
  2: 'bg-emerald-700 text-emerald-50',
}

function comparisonColor(notation: string, marks: RangeMarks, groundTruth: Set<string>): string {
  const marked = (marks[notation] ?? 0) > 0
  const actual = groundTruth.has(notation)
  if (marked && actual) return 'bg-emerald-700 text-emerald-50' // correctly included
  if (!marked && actual) return 'bg-amber-700/70 text-amber-50' // you missed this one
  if (marked && !actual) return 'bg-rose-800/80 text-rose-50' // you over-included this one
  return 'bg-neutral-900 text-neutral-700' // correctly excluded
}

export function RangeGrid({ marks = {}, onCellClick, groundTruth, compact }: RangeGridProps) {
  const grid = rangeGridLayout()
  const cellSize = compact ? 'h-5 w-5 text-[8px] sm:h-6 sm:w-6 sm:text-[9px]' : 'h-7 w-7 text-[9px] sm:h-8 sm:w-8 sm:text-[10px]'

  return (
    <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
      {grid.map((row, r) =>
        row.map((notation, c) => {
          const colorClass = groundTruth
            ? comparisonColor(notation, marks, groundTruth)
            : LIVE_COLORS[marks[notation] ?? 0]
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              disabled={!onCellClick}
              onClick={() => onCellClick?.(notation)}
              className={`flex items-center justify-center rounded-sm font-medium leading-none ${cellSize} ${colorClass} ${
                onCellClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              }`}
              title={notation}
            >
              {notation}
            </button>
          )
        }),
      )}
    </div>
  )
}
