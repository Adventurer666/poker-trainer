/**
 * pokersolver ships no TypeScript types. This is a minimal ambient
 * declaration covering the surface we use (see src/engine/handEvaluator.ts).
 */
declare module 'pokersolver' {
  export class Hand {
    static solve(cards: string[], game?: string): Hand
    static winners(hands: Hand[]): Hand[]

    cards: unknown[]
    name: string
    descr: string
  }
}
