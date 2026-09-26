/**
 * Skill is orthogonal to persona/archetype: a persona (the-rock, maniac, …)
 * describes STYLE — tight/loose, passive/aggressive. Skill describes
 * EXECUTION QUALITY — which real-poker factors a player actually applies,
 * and how well. A "beginner maniac" and an "advanced maniac" are both
 * loose-aggressive, but the advanced one reasons about opponents' ranges;
 * the beginner one only ever looks at its own hand.
 *
 * This is deliberately the MVP slice of a larger plan: skill currently
 * gates postflop hand-strength estimation only (see botDecision.ts) —
 * beginners use the old made-hand/draw heuristic, intermediate and
 * advanced use real Monte Carlo equity vs. a believed opponent range, with
 * advanced additionally narrowing that range street-by-street as actions
 * happen. Preflop range-application, frequency mixing, mistake injection,
 * and session-level opponent exploitation are follow-up work, not part of
 * this pass.
 */
export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export type SkillLevel = (typeof SKILL_LEVELS)[number]

export function randomSkillLevel(rng: () => number = Math.random): SkillLevel {
  return SKILL_LEVELS[Math.floor(rng() * SKILL_LEVELS.length)]
}
