import type { Difficulty } from "./types";

/** Rating a learner/item starts at before any data -- corresponds to difficulty 3. */
export const DEFAULT_RATING = 1000;

/** Rating gap per difficulty step (1-5), same scale family as chess Elo. */
export const RATING_STEP = 200;

/** How fast a topic rating moves per answer. Higher = more reactive to recent performance. */
export const TOPIC_K_FACTOR = 40;

/** How fast the section-level rating (cold-start prior for new topics) moves. Deliberately slow. */
export const SECTION_K_FACTOR = 10;

/**
 * Desired probability of success when picking the next question. Below 0.5 (true CAT)
 * because this is a study tool, not an exam -- a slightly-favorable success rate keeps
 * practice motivating without making it trivial.
 */
export const TARGET_SUCCESS_PROBABILITY = 0.65;

export function difficultyToRating(difficulty: Difficulty): number {
  return DEFAULT_RATING + (difficulty - 3) * RATING_STEP;
}

/** Standard logistic expected-score function, same form as Elo. */
export function expectedScore(learnerRating: number, itemRating: number): number {
  return 1 / (1 + Math.pow(10, (itemRating - learnerRating) / 400));
}

export function updateRating(
  rating: number,
  expected: number,
  actualScore: 0 | 1,
  k: number = TOPIC_K_FACTOR
): number {
  return rating + k * (actualScore - expected);
}
