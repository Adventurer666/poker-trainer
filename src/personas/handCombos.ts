import { SUITS, cardToString, type Card, type Rank } from '../types/card'

/**
 * All concrete 2-card combos a starting-hand notation ("AKs", "72o", "AA")
 * represents, excluding any combo that uses a card in `deadCards` (already
 * dealt to a hero's hand, the board, or elsewhere). Used to turn an
 * abstract range (a Set of notations) into cards the equity simulator can
 * actually deal.
 */
export function combosForNotation(notation: string, deadCards: Card[]): [Card, Card][] {
  const dead = new Set(deadCards.map(cardToString))
  const isPair = notation.length === 2
  const highRank = notation[0] as Rank
  const lowRank = notation[1] as Rank
  const suited = notation.endsWith('s')
  const combos: [Card, Card][] = []

  const ok = (c: Card) => !dead.has(cardToString(c))

  if (isPair) {
    for (let i = 0; i < SUITS.length; i++) {
      for (let j = i + 1; j < SUITS.length; j++) {
        const a: Card = { rank: highRank, suit: SUITS[i] }
        const b: Card = { rank: highRank, suit: SUITS[j] }
        if (ok(a) && ok(b)) combos.push([a, b])
      }
    }
    return combos
  }

  if (suited) {
    for (const s of SUITS) {
      const a: Card = { rank: highRank, suit: s }
      const b: Card = { rank: lowRank, suit: s }
      if (ok(a) && ok(b)) combos.push([a, b])
    }
    return combos
  }

  // offsuit
  for (const s1 of SUITS) {
    for (const s2 of SUITS) {
      if (s1 === s2) continue
      const a: Card = { rank: highRank, suit: s1 }
      const b: Card = { rank: lowRank, suit: s2 }
      if (ok(a) && ok(b)) combos.push([a, b])
    }
  }
  return combos
}

/** Every live combo across a whole range (a Set of notations), card-removal applied. */
export function flattenRangeToCombos(range: Set<string>, deadCards: Card[]): [Card, Card][] {
  const combos: [Card, Card][] = []
  for (const notation of range) {
    combos.push(...combosForNotation(notation, deadCards))
  }
  return combos
}

/** One representative live combo for a notation, or null if every combo is blocked. */
export function anyComboForNotation(notation: string, deadCards: Card[]): [Card, Card] | null {
  const combos = combosForNotation(notation, deadCards)
  return combos.length > 0 ? combos[0] : null
}
