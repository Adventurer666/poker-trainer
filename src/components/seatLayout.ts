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
