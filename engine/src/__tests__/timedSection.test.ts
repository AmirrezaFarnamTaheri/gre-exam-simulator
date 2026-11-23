import { describe, expect, it } from "vitest";
import { selectTimedSection } from "../timedSection";
import type { AnyQuestion, ReadingComprehensionQuestion } from "../types";
import timedReading from "../../../data/questions/verbal/timed_reading.json";
import practiceReading from "../../../data/questions/verbal/reading_comprehension.json";
import textCompletion from "../../../data/questions/verbal/text_completion.json";
import sentenceEquivalence from "../../../data/questions/verbal/sentence_equivalence.json";

const timed = timedReading as ReadingComprehensionQuestion[];
const practice = [...practiceReading, ...textCompletion, ...sentenceEquivalence] as AnyQuestion[];
const isReading = (question: AnyQuestion): question is ReadingComprehensionQuestion =>
  question.qtype === "reading_comprehension";

describe("timed verbal sections", () => {
  it.each(["easy", "medium", "hard"] as const)("balances formats and reserves distinct passages for %s part 2", (band) => {
    for (const random of [() => 0, () => 0.42, () => 0.99]) {
      const first = selectTimedSection(practice, timed, "verbal", 12, "medium", new Set(), random);
      const second = selectTimedSection(practice, timed, "verbal", 15, band, new Set(first.map(({ id }) => id)), random);
      expect(first).toHaveLength(12);
      expect(second).toHaveLength(15);
      expect(first.filter(isReading)).toHaveLength(6);
      expect(second.filter(isReading)).toHaveLength(8);
      const unique = new Set([...first, ...second].map(({ id }) => id));
      expect(unique.size).toBe(27);
      const firstPassages = new Set(first.filter(isReading).map(({ passage_id }) => passage_id));
      expect(second.filter(isReading).every(({ passage_id }) => !firstPassages.has(passage_id))).toBe(true);
      for (const part of [first, second]) {
        expect(part.some(({ qtype }) => qtype === "text_completion")).toBe(true);
        expect(part.some(({ qtype }) => qtype === "sentence_equivalence")).toBe(true);
        for (const group of new Set(part.filter(isReading).map(({ passage_id }) => passage_id))) {
          const positions = part.flatMap((question, index) => isReading(question) && question.passage_id === group ? [index] : []);
          expect(positions).toHaveLength(2);
          expect(positions[1] - positions[0]).toBe(1);
          expect(practiceReading.some(({ passage_id }) => passage_id === group)).toBe(false);
        }
      }
    }
  });
});
