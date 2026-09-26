function formatChips(n: number): string {
  return n.toLocaleString('en-US')
}

/** How many chip discs to draw for a given bet size — just a visual cue, not literal denominations. */
function discCount(amount: number): number {
  if (amount >= 2000) return 4
  if (amount >= 500) return 3
  if (amount >= 100) return 2
  return 1
}

interface ChipStackProps {
  amount: number
}

/** A small stack of poker chips with the bet amount, meant to sit between a player and the pot. */
export function ChipStack({ amount }: ChipStackProps) {
  if (amount <= 0) return null
  const discs = discCount(amount)

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative h-4 w-4 sm:h-5 sm:w-5">
        {Array.from({ length: discs }).map((_, i) => (
          <span
            key={i}
            className="absolute left-0 h-2 w-4 rounded-full border border-amber-300/70 bg-gradient-to-b from-amber-400 to-amber-600 shadow sm:h-2.5 sm:w-5"
            style={{ bottom: `${i * 3}px` }}
          />
        ))}
      </div>
      <span className="rounded-full border border-neutral-700 bg-neutral-950/90 px-1.5 py-0.5 text-[8px] text-neutral-200 sm:text-[10px]">
        {formatChips(amount)}
      </span>
    </div>
  )
}
