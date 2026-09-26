/**
 * Where each seat sits around the table, as CSS percentages within a
 * relatively-positioned oval container. Seat 0 (always the human — see
 * gameStore) sits at the bottom; higher seat numbers go clockwise, matching
 * the engine's seating convention in src/engine/positions.ts.
 */
export function seatPosition(seatIndex: number, totalSeats: number): { left: string; top: string } {
  const angleDeg = 90 - seatIndex * (360 / totalSeats)
  const angleRad = (angleDeg * Math.PI) / 180
  // Equal percentages on each axis trace an ellipse matching the
  // container's own aspect ratio, since each is a % of its own axis.
  const radius = 43
  const left = 50 + radius * Math.cos(angleRad)
  const top = 50 + radius * Math.sin(angleRad)
  return { left: `${left}%`, top: `${top}%` }
}

/**
 * Where a player's bet-this-street chips sit: same angle as their seat, but
 * pulled in toward the pot so the chips read as "in front of them, toward
 * the middle" rather than out past their pod.
 */
export function betPosition(seatIndex: number, totalSeats: number): { left: string; top: string } {
  const angleDeg = 90 - seatIndex * (360 / totalSeats)
  const angleRad = (angleDeg * Math.PI) / 180
  const radius = 27
  const left = 50 + radius * Math.cos(angleRad)
  const top = 50 + radius * Math.sin(angleRad)
  return { left: `${left}%`, top: `${top}%` }
}
