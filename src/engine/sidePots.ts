export interface SidePot {
  amount: number
  /** Player ids eligible to win this pot. */
  eligiblePlayerIds: string[]
}

/**
 * Splits total per-player contributions into a main pot and any side pots,
 * so an all-in for less than the full bet only competes for the portion of
 * the pot it could actually match. Required because v1 uses variable stack
 * depth rather than fixed, equal stacks.
 *
 * `contributions`: total chips each player put in the hand (all streets).
 * `foldedPlayerIds`: players who folded — they contributed but can't win.
 */
export function calculateSidePots(
  contributions: Record<string, number>,
  foldedPlayerIds: Set<string>,
): SidePot[] {
  const entries = Object.entries(contributions).filter(([, amount]) => amount > 0)
  if (entries.length === 0) return []

  const distinctLevels = Array.from(new Set(entries.map(([, amount]) => amount))).sort(
    (a, b) => a - b,
  )

  const pots: SidePot[] = []
  let previousLevel = 0
  // Chips from a layer where every payer folded have nowhere to go until a
  // later layer has an eligible winner — carry them forward rather than
  // losing them (can't happen with a real single remaining player winning
  // uncontested, but this keeps the math correct in all input cases).
  let carry = 0

  for (const level of distinctLevels) {
    const layerSize = level - previousLevel
    if (layerSize <= 0) continue

    // Everyone who contributed at least up to this level pays into this layer.
    const payers = entries.filter(([, amount]) => amount >= level)
    const amount = layerSize * payers.length

    // Only non-folded payers can win it.
    const eligiblePlayerIds = payers
      .map(([playerId]) => playerId)
      .filter((id) => !foldedPlayerIds.has(id))

    if (eligiblePlayerIds.length > 0) {
      pots.push({ amount: amount + carry, eligiblePlayerIds })
      carry = 0
    } else {
      carry += amount
    }
    previousLevel = level
  }

  if (carry > 0 && pots.length > 0) {
    pots[pots.length - 1].amount += carry
  }

  return mergeAdjacentPotsWithSameEligibility(pots)
}

function sameEligibility(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const bSet = new Set(b)
  return a.every((id) => bSet.has(id))
}

/** Two consecutive layers with the exact same eligible winners are really one pot. */
function mergeAdjacentPotsWithSameEligibility(pots: SidePot[]): SidePot[] {
  const merged: SidePot[] = []
  for (const pot of pots) {
    const last = merged[merged.length - 1]
    if (last && sameEligibility(last.eligiblePlayerIds, pot.eligiblePlayerIds)) {
      last.amount += pot.amount
    } else {
      merged.push({ ...pot })
    }
  }
  return merged
}
