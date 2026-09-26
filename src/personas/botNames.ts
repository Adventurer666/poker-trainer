/**
 * Flavor names for bot seats — deliberately unrelated to persona identity.
 * The whole point of the trainer is reading a player from their actions,
 * not their label, so a name must never hint at play style (no "Rocky",
 * "Maniac Mike", etc.).
 */
const NAME_POOL = [
  'Marcus',
  'Elena',
  'Diego',
  'Priya',
  'Sam',
  'Nadia',
  'Victor',
  'Lena',
  'Omar',
  'Tasha',
  'Felix',
  'Ingrid',
  'Rafael',
  'Yuki',
  'Chloe',
  'Andre',
]

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** A random, distinct name for each of `count` bot seats. */
export function assignBotNames(count: number, rng: () => number = Math.random): string[] {
  if (count > NAME_POOL.length) {
    throw new Error(`Only ${NAME_POOL.length} bot names available, need ${count}`)
  }
  return shuffle(NAME_POOL, rng).slice(0, count)
}
