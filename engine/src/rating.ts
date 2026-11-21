import type { AdaptiveDifficultyBand, Difficulty, Section } from "./types";

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

/**
 * Shortened GRE (2023+) Section 1 (12 Q) -> Section 2 (15 Q) routing:
 * <= 4/12 -> Easy S2; 5-7/12 -> Medium S2; >= 8/12 -> Hard S2.
 */
export function determineSection2Difficulty(s1Correct: number, s1Total = 12): AdaptiveDifficultyBand {
  const ratio = s1Total > 0 ? s1Correct / s1Total : 0;
  if (ratio >= 8 / 12) return "hard";
  if (ratio <= 4 / 12) return "easy";
  return "medium";
}

/**
 * Calibrated Shortened-GRE 130-170 scaled score model across 27 total questions (12 S1 + 15 S2),
 * applying ETS-aligned adaptive routing bonuses/ceilings for Easy/Medium/Hard Section 2.
 */
export function calculateAdaptiveGreScore(
  section: Section,
  s1Correct: number,
  s2Correct: number,
  s2Difficulty: AdaptiveDifficultyBand,
  totalQuestions = 27
): number {
  const raw = Math.max(0, Math.min(totalQuestions, s1Correct + s2Correct));
  const normalized27 = totalQuestions > 0 ? (raw / totalQuestions) * 27 : 0;
  // Base curve anchored to shortened GRE (27 raw -> 170 on Hard; 0 raw -> 130)
  const base = 130 + (normalized27 / 27) * 38;
  const bonus =
    section === "verbal"
      ? s2Difficulty === "hard"
        ? 3
        : s2Difficulty === "easy"
        ? -3
        : 0
      : s2Difficulty === "hard"
      ? 2
      : s2Difficulty === "easy"
      ? -4
      : 0;
  const ceiling =
    s2Difficulty === "easy" ? (section === "verbal" ? 155 : 153) : s2Difficulty === "medium" ? 164 : 170;
  const scaled = Math.round(base + bonus);
  return Math.max(130, Math.min(ceiling, scaled));
}
