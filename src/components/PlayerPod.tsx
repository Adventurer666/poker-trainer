import type { Player } from '../types/poker'
import { CardBack, CardView } from './CardView'

// Cycled by seat, not persona — purely cosmetic variety, never a tell.
const AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-sky-700',
  'bg-emerald-700',
  'bg-violet-700',
  'bg-amber-700',
  'bg-rose-700',
  'bg-cyan-700',
  'bg-lime-700',
  'bg-orange-700',
]

interface PlayerPodProps {
  player: Player
  isToAct: boolean
  isButton: boolean
  showCards: boolean
  betThisStreet: number
  isHuman: boolean
}

function formatChips(n: number): string {
  return n.toLocaleString('en-US')
}

export function PlayerPod({ player, isToAct, isButton, showCards, betThisStreet, isHuman }: PlayerPodProps) {
  const avatarColor = AVATAR_COLORS[player.seat % AVATAR_COLORS.length]

  return (
    <div
      className={`relative flex flex-col items-center gap-0.5 rounded-lg border px-1.5 py-1 backdrop-blur-sm transition-all sm:gap-1 sm:rounded-xl sm:px-2 sm:py-2 ${
        isHuman ? 'w-20 sm:w-28' : 'w-16 sm:w-24'
      } ${
        isToAct
          ? 'border-amber-400 bg-neutral-900/95 shadow-[0_0_0_2px_rgba(251,191,36,0.35)]'
          : 'border-neutral-700/80 bg-neutral-900/80'
      } ${player.isFolded ? 'opacity-35 grayscale' : ''}`}
    >
      {isButton && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-100 text-[8px] font-bold text-neutral-900 shadow sm:-right-2 sm:-top-2 sm:h-5 sm:w-5 sm:text-[10px]">
          D
        </span>
      )}

      <div className="flex items-center gap-1 sm:gap-1.5">
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold text-white sm:h-6 sm:w-6 sm:text-[11px] ${avatarColor}`}
        >
          {player.name.charAt(0)}
        </span>
        <span className="truncate text-[10px] font-medium text-neutral-100 sm:text-xs">{player.name}</span>
      </div>

      <div className="flex gap-0.5">
        {player.holeCards?.map((card, i) =>
          showCards ? <CardView key={i} card={card} /> : <CardBack key={i} />,
        )}
      </div>

      <div className="text-[9px] text-neutral-400 sm:text-[11px]">{formatChips(player.stack)}</div>

      {player.isAllIn && (
        <span className="rounded-full bg-red-950 px-1 py-0.5 text-[7px] font-medium uppercase tracking-wide text-red-300 sm:px-1.5 sm:text-[9px]">
          All-in
        </span>
      )}

      {betThisStreet > 0 && !player.isFolded && (
        <span className="absolute -bottom-5 rounded-full border border-neutral-700 bg-neutral-950 px-1.5 py-0.5 text-[8px] text-neutral-300 sm:-bottom-6 sm:px-2 sm:text-[10px]">
          {formatChips(betThisStreet)}
        </span>
      )}
    </div>
  )
}
