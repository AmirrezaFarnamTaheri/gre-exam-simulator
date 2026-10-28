import { DEFAULT_RATING, TARGET_SUCCESS_PROBABILITY, TOPIC_K_FACTOR, SECTION_K_FACTOR, difficultyToRating, expectedScore, updateRating } from "./rating";
import type { AdaptiveState, AnyQuestion, AttemptRecord, Section, TopicStat } from "./types";

/** How many recently-seen question ids per topic we remember (for repeat avoidance). */
const RECENT_HISTORY_LIMIT = 8;

/** How many of those recent ids we actually try to avoid re-serving. Must be <= RECENT_HISTORY_LIMIT. */
const DEFAULT_EXCLUDE_RECENT = 5;

/** How close two candidates' success probabilities must be to be treated as a tie. */
const SELECTION_TIE_EPSILON = 0.02;

export function createInitialState(): AdaptiveState {
  return {
    version: 1,
    sectionRatings: { verbal: DEFAULT_RATING, quant: DEFAULT_RATING },
    topicStats: {},
    attempts: [],
  };
}

export function topicsForSection(bank: AnyQuestion[], section: Section): string[] {
  return [...new Set(bank.filter((q) => q.section === section).map((q) => q.topic))];
}

function getTopicRating(state: AdaptiveState, topic: string, section: Section): number {
  return state.topicStats[topic]?.rating ?? state.sectionRatings[section];
}

/** Picks a random element via an injectable rng, clamped so rng()===1 can't index out of bounds. */
function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.min(Math.floor(rng() * arr.length), arr.length - 1)];
}

export interface SelectOptions {
  section?: Section;
  /** Restrict candidates to these topics (e.g. targeted review of specific weak areas). */
  topics?: string[];
  excludeRecentCount?: number;
  /** Probability [0,1] of biasing topic choice toward the learner's weakest topics. */
  weakTopicBias?: number;
  /** Injectable RNG for deterministic tests; defaults to Math.random. */
  rng?: () => number;
}

/**
 * Picks the next question: biases which *topic* to draw from toward weaker areas,
 * then within that topic picks the question whose difficulty puts the learner's
 * expected success closest to TARGET_SUCCESS_PROBABILITY.
 */
export function selectNextQuestion(
  state: AdaptiveState,
  bank: AnyQuestion[],
  options: SelectOptions = {}
): AnyQuestion | null {
  const { section, topics, excludeRecentCount = DEFAULT_EXCLUDE_RECENT, weakTopicBias = 0.6, rng = Math.random } = options;

  const pool = bank.filter(
    (q) => (!section || q.section === section) && (!topics || topics.includes(q.topic))
  );
  if (pool.length === 0) return null;

  const topicList = [...new Set(pool.map((q) => q.topic))];
  const topicSection = new Map(pool.map((q) => [q.topic, q.section] as const));
  const ratingsByTopic = new Map(topicList.map((t) => [t, getTopicRating(state, t, topicSection.get(t)!)] as const));

  const rankedWeakestFirst = [...topicList].sort((a, b) => ratingsByTopic.get(a)! - ratingsByTopic.get(b)!);

  let chosenTopic: string;
  if (topicList.length === 1) {
    chosenTopic = topicList[0];
  } else if (rng() < weakTopicBias) {
    // Weighted pick: weakest topic gets weight N, strongest gets weight 1.
    const weights = rankedWeakestFirst.map((_, rank) => rankedWeakestFirst.length - rank);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < weights.length; idx++) {
      r -= weights[idx];
      if (r <= 0) break;
    }
    chosenTopic = rankedWeakestFirst[Math.min(idx, rankedWeakestFirst.length - 1)];
  } else {
    chosenTopic = pickRandom(topicList, rng);
  }

  const candidates = pool.filter((q) => q.topic === chosenTopic);
  const recentIds = new Set(
    (state.topicStats[chosenTopic]?.recentQuestionIds ?? []).slice(-excludeRecentCount)
  );
  const fresh = candidates.filter((q) => !recentIds.has(q.id));
  const usable = fresh.length > 0 ? fresh : candidates; // all seen recently -> allow repeats

  const targetRating = ratingsByTopic.get(chosenTopic)!;
  const scored = usable.map((q) => ({
    question: q,
    gap: Math.abs(expectedScore(targetRating, difficultyToRating(q.difficulty)) - TARGET_SUCCESS_PROBABILITY),
  }));
  const minGap = Math.min(...scored.map((s) => s.gap));
  const bestMatches = scored.filter((s) => s.gap <= minGap + SELECTION_TIE_EPSILON);

  return pickRandom(bestMatches, rng).question;
}

export function recordAnswer(
  state: AdaptiveState,
  question: AnyQuestion,
  correct: boolean,
  now: number = Date.now()
): AdaptiveState {
  const { section, topic, difficulty, id } = question;
  const itemRating = difficultyToRating(difficulty);
  const actual: 0 | 1 = correct ? 1 : 0;

  const prevTopicStat = state.topicStats[topic];
  const topicRatingBefore = prevTopicStat?.rating ?? state.sectionRatings[section];
  const topicExpected = expectedScore(topicRatingBefore, itemRating);
  const topicRatingAfter = updateRating(topicRatingBefore, topicExpected, actual, TOPIC_K_FACTOR);

  const newTopicStat: TopicStat = {
    rating: topicRatingAfter,
    attempts: (prevTopicStat?.attempts ?? 0) + 1,
    correct: (prevTopicStat?.correct ?? 0) + actual,
    lastSeenAt: now,
    recentQuestionIds: [...(prevTopicStat?.recentQuestionIds ?? []), id].slice(-RECENT_HISTORY_LIMIT),
  };

  const sectionRatingBefore = state.sectionRatings[section];
  const sectionExpected = expectedScore(sectionRatingBefore, itemRating);
  const sectionRatingAfter = updateRating(sectionRatingBefore, sectionExpected, actual, SECTION_K_FACTOR);

  const attempt: AttemptRecord = {
    questionId: id,
    section,
    topic,
    difficulty,
    correct,
    timestamp: now,
    ratingBefore: topicRatingBefore,
    ratingAfter: topicRatingAfter,
  };

  return {
    ...state,
    sectionRatings: { ...state.sectionRatings, [section]: sectionRatingAfter },
    topicStats: { ...state.topicStats, [topic]: newTopicStat },
    attempts: [...state.attempts, attempt],
  };
}

export interface TopicSummary {
  topic: string;
  rating: number;
  attempts: number;
  correct: number;
  accuracy: number | null;
}

/** Weakest topic first. Topics with no attempts yet default to DEFAULT_RATING. */
export function getTopicSummary(state: AdaptiveState, topics: string[]): TopicSummary[] {
  return topics
    .map((topic) => {
      const stat = state.topicStats[topic];
      return {
        topic,
        rating: stat?.rating ?? DEFAULT_RATING,
        attempts: stat?.attempts ?? 0,
        correct: stat?.correct ?? 0,
        accuracy: stat && stat.attempts > 0 ? stat.correct / stat.attempts : null,
      };
    })
    .sort((a, b) => a.rating - b.rating);
}

export function getWeakTopics(state: AdaptiveState, topics: string[], n = 3): string[] {
  return getTopicSummary(state, topics)
    .slice(0, n)
    .map((s) => s.topic);
}
