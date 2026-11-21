import { describe, expect, it } from "vitest";
import {
  DEFAULT_RATING,
  calculateAdaptiveGreScore,
  determineSection2Difficulty,
  difficultyToRating,
  expectedScore,
  updateRating,
} from "../rating";

describe("difficultyToRating", () => {
  it("maps difficulty 3 (midpoint) to the default rating", () => {
    expect(difficultyToRating(3)).toBe(DEFAULT_RATING);
  });

  it("scales linearly around the midpoint", () => {
    expect(difficultyToRating(1)).toBe(DEFAULT_RATING - 400);
    expect(difficultyToRating(5)).toBe(DEFAULT_RATING + 400);
  });
});

describe("expectedScore", () => {
  it("is 0.5 when learner and item ratings are equal", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 10);
  });

  it("favors the learner when their rating exceeds the item's", () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
  });

  it("favors the item when its rating exceeds the learner's", () => {
    expect(expectedScore(800, 1000)).toBeLessThan(0.5);
  });
});

describe("updateRating", () => {
  it("increases the rating when the actual score beats expectation", () => {
    expect(updateRating(1000, 0.5, 1, 40)).toBe(1020);
  });

  it("decreases the rating when the actual score falls short of expectation", () => {
    expect(updateRating(1000, 0.5, 0, 40)).toBe(980);
  });

  it("leaves the rating unchanged when actual matches expectation exactly", () => {
    expect(updateRating(1000, 1, 1, 40)).toBe(1000);
  });
});

describe("shortened GRE adaptive routing & scoring", () => {
  it("routes Section 1 scores to easy / medium / hard Section 2", () => {
    expect(determineSection2Difficulty(3, 12)).toBe("easy");
    expect(determineSection2Difficulty(4, 12)).toBe("easy");
    expect(determineSection2Difficulty(6, 12)).toBe("medium");
    expect(determineSection2Difficulty(8, 12)).toBe("hard");
    expect(determineSection2Difficulty(11, 12)).toBe("hard");
  });

  it("caps easy routing and rewards hard routing within 130-170", () => {
    const perfectHard = calculateAdaptiveGreScore("quant", 12, 15, "hard", 27);
    const cappedEasy = calculateAdaptiveGreScore("quant", 4, 15, "easy", 27);
    const zeroScore = calculateAdaptiveGreScore("verbal", 0, 0, "easy", 27);
    expect(perfectHard).toBe(170);
    expect(cappedEasy).toBeLessThanOrEqual(153);
    expect(zeroScore).toBe(130);
  });
});
