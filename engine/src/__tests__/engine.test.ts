import { describe, expect, it } from "vitest";
import {
  createInitialState,
  getTopicSummary,
  getWeakTopics,
  recordAnswer,
  selectNextQuestion,
  topicsForSection,
} from "../engine";
import { DEFAULT_RATING } from "../rating";
import type { QuantNumericEntryQuestion } from "../types";

import algebra from "../../../data/questions/quant/algebra.json";
import arithmetic from "../../../data/questions/quant/arithmetic.json";
import dataAnalysis from "../../../data/questions/quant/data_analysis.json";
import geometry from "../../../data/questions/quant/geometry.json";
import readingComprehension from "../../../data/questions/verbal/reading_comprehension.json";
import sentenceEquivalence from "../../../data/questions/verbal/sentence_equivalence.json";
import textCompletion from "../../../data/questions/verbal/text_completion.json";
import { loadQuestionBank } from "../questionBank";

const bank = loadQuestionBank({
  textCompletion,
  sentenceEquivalence,
  readingComprehension,
  arithmetic,
  algebra,
  geometry,
  dataAnalysis,
});

function makeQuestion(overrides: Partial<QuantNumericEntryQuestion> = {}): QuantNumericEntryQuestion {
  return {
    id: "fake-1",
    section: "quant",
    qtype: "quant_numeric_entry",
    topic: "arithmetic_test_topic",
    difficulty: 3,
    explanation: "test",
    source: "seed",
    tags: [],
    prompt: "2 + 2?",
    correct: "4",
    ...overrides,
  };
}

describe("createInitialState", () => {
  it("starts both sections at the default rating with no history", () => {
    const state = createInitialState();
    expect(state.sectionRatings.verbal).toBe(DEFAULT_RATING);
    expect(state.sectionRatings.quant).toBe(DEFAULT_RATING);
    expect(Object.keys(state.topicStats)).toHaveLength(0);
    expect(state.attempts).toHaveLength(0);
  });
});

describe("recordAnswer", () => {
  it("raises the topic rating on a correct answer at matched difficulty", () => {
    const state = createInitialState();
    const q = makeQuestion({ difficulty: 3 }); // itemRating 1000 == default learner rating -> expected 0.5
    const next = recordAnswer(state, q, true, 0);
    expect(next.topicStats[q.topic].rating).toBe(1020); // 1000 + 40*(1-0.5)
    expect(next.topicStats[q.topic].attempts).toBe(1);
    expect(next.topicStats[q.topic].correct).toBe(1);
    expect(next.attempts).toHaveLength(1);
    expect(next.attempts[0]).toMatchObject({ questionId: q.id, correct: true, ratingBefore: 1000, ratingAfter: 1020 });
  });

  it("lowers the topic rating on a wrong answer at matched difficulty", () => {
    const state = createInitialState();
    const q = makeQuestion({ difficulty: 3 });
    const next = recordAnswer(state, q, false, 0);
    expect(next.topicStats[q.topic].rating).toBe(980); // 1000 - 40*0.5
  });

  it("does not mutate the input state", () => {
    const state = createInitialState();
    const q = makeQuestion();
    recordAnswer(state, q, true, 0);
    expect(state.topicStats).toEqual({});
    expect(state.attempts).toHaveLength(0);
  });

  it("nudges the section rating slower than the topic rating", () => {
    const state = createInitialState();
    const q = makeQuestion({ difficulty: 3 });
    const next = recordAnswer(state, q, true, 0);
    expect(next.sectionRatings.quant).toBe(1005); // 1000 + 10*(1-0.5)
  });
});

describe("getTopicSummary / getWeakTopics", () => {
  it("sorts topics weakest (lowest rating) first", () => {
    let state = createInitialState();
    const strong = makeQuestion({ id: "s1", topic: "strong_topic", difficulty: 5 });
    const weak = makeQuestion({ id: "w1", topic: "weak_topic", difficulty: 1 });
    state = recordAnswer(state, strong, true, 0);
    state = recordAnswer(state, weak, false, 0);

    const summary = getTopicSummary(state, ["strong_topic", "weak_topic"]);
    expect(summary[0].topic).toBe("weak_topic");
    expect(summary[1].topic).toBe("strong_topic");
    expect(getWeakTopics(state, ["strong_topic", "weak_topic"], 1)).toEqual(["weak_topic"]);
  });

  it("treats never-attempted topics as sitting at the default rating", () => {
    const state = createInitialState();
    const summary = getTopicSummary(state, ["untouched_topic"]);
    expect(summary[0]).toMatchObject({ topic: "untouched_topic", rating: DEFAULT_RATING, attempts: 0, accuracy: null });
  });
});

describe("selectNextQuestion", () => {
  it("returns null when the filtered pool is empty", () => {
    const state = createInitialState();
    expect(selectNextQuestion(state, bank, { topics: ["no_such_topic"] })).toBeNull();
  });

  it("only returns questions from the requested section", () => {
    const state = createInitialState();
    for (let i = 0; i < 25; i++) {
      const q = selectNextQuestion(state, bank, { section: "quant", rng: () => Math.random() });
      expect(q?.section).toBe("quant");
    }
  });

  it("deterministically favors the weakest topic when weakTopicBias=1 and rng=0", () => {
    let state = createInitialState();
    const weakQ = makeQuestion({ id: "weak-q", topic: "weak", difficulty: 3 });
    const strongQ = makeQuestion({ id: "strong-q", topic: "strong", difficulty: 3 });
    // Make "weak" much lower-rated than "strong".
    state = recordAnswer(state, { ...weakQ, difficulty: 1 }, false, 0);
    state = recordAnswer(state, { ...strongQ, difficulty: 5 }, true, 0);

    const twoTopicBank = [weakQ, strongQ];
    const picked = selectNextQuestion(state, twoTopicBank, { weakTopicBias: 1, rng: () => 0 });
    expect(picked?.topic).toBe("weak");
  });

  it("avoids re-serving a question that was just seen while alternatives exist in the topic", () => {
    let state = createInitialState();
    const q1 = makeQuestion({ id: "q1", topic: "same_topic", difficulty: 3 });
    const q2 = makeQuestion({ id: "q2", topic: "same_topic", difficulty: 3 });
    state = recordAnswer(state, q1, true, 0);

    const picked = selectNextQuestion(state, [q1, q2], { rng: () => 0.5 });
    expect(picked?.id).toBe("q2");
  });
});

describe("topicsForSection", () => {
  it("returns unique topics scoped to a section from the real question bank", () => {
    const quantTopics = topicsForSection(bank, "quant");
    const verbalTopics = topicsForSection(bank, "verbal");
    expect(quantTopics.length).toBeGreaterThan(0);
    expect(verbalTopics.length).toBeGreaterThan(0);
    expect(new Set(quantTopics).size).toBe(quantTopics.length);
  });
});
