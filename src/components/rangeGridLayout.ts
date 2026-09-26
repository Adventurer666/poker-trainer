import { RANKS } from '../types/card'

/**
 * The conventional 13x13 starting-hand grid: pairs on the diagonal, suited
 * combos above it, offsuit combos below it. Notation matches
 * handRanking.ts/handNotation.ts exactly (high rank first, "s"/"o" suffix).
 */
export function rangeGridLayout(): string[][] {
  const ranksDesc = [...RANKS].reverse() // A, K, Q, ..., 2
  const grid: string[][] = []
  for (let row = 0; row < ranksDesc.length; row++) {
    const line: string[] = []
    for (let col = 0; col < ranksDesc.length; col++) {
      if (row === col) {
        line.push(`${ranksDesc[row]}${ranksDesc[row]}`)
      } else if (row < col) {
        line.push(`${ranksDesc[row]}${ranksDesc[col]}s`)
      } else {
        line.push(`${ranksDesc[col]}${ranksDesc[row]}o`)
      }
    }
    grid.push(line)
  }
  return grid
}
