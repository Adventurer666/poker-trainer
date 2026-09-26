import type { Card } from '../types/card'

const SUIT_SYMBOL: Record<Card['suit'], string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
const RED_SUITS = new Set(['h', 'd'])

export function CardView({ card }: { card: Card }) {
  const isRed = RED_SUITS.has(card.suit)
  return (
    <span
      className={`inline-flex h-6 w-5 items-center justify-center rounded border border-neutral-700 bg-neutral-900 text-[10px] font-medium sm:h-9 sm:w-7 sm:text-sm ${
        isRed ? 'text-red-400' : 'text-neutral-100'
      }`}
    >
      {card.rank}
      {SUIT_SYMBOL[card.suit]}
    </span>
  )
}

export function CardBack() {
  return (
    <span className="inline-flex h-6 w-5 items-center justify-center rounded border border-neutral-700 bg-neutral-800 text-[10px] text-neutral-600 sm:h-9 sm:w-7">
      ?
    </span>
  )
}
