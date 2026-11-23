import type { AnyQuestion } from "gre-adaptive-engine";

export type QuestionType = AnyQuestion["qtype"];

export interface ExamTaskTarget {
  section: string;
  task: string;
  pacingSeconds: number;
  pacingLabel: string;
  detail: string;
}

export const QTYPE_FILTER_LABELS: Record<QuestionType, string> = {
  quant_comparison: "Quantitative Comparison",
  quant_multiple_choice: "Problem Solving (Multiple Choice)",
  quant_numeric_entry: "Problem Solving (Numeric Entry)",
  data_interpretation: "Data Interpretation",
  text_completion: "Text Completion",
  sentence_equivalence: "Sentence Equivalence",
  reading_comprehension: "Reading Comprehension",
};

export function getQuestionExamTarget(question: AnyQuestion): ExamTaskTarget {
  switch (question.qtype) {
    case "quant_comparison":
      return {
        section: "Quantitative Reasoning",
        task: "Quantitative Comparison",
        pacingSeconds: 75,
        pacingLabel: "~1m 15s / Q",
        detail: "Compare Quantity A and Quantity B (about 35% of GRE Math; test 0, negatives, and fractions before choosing).",
      };
    case "quant_multiple_choice":
      return {
        section: "Quantitative Reasoning",
        task: question.select_all ? "Problem Solving (Select All That Apply)" : "Problem Solving (Single Choice)",
        pacingSeconds: 105,
        pacingLabel: "~1m 45s / Q",
        detail: question.select_all
          ? "Check every answer choice independently; partial credit is not awarded on the GRE."
          : "Standard 5-choice GRE Math problem across Section 1 (12 Q, 21m) and Section 2 (15 Q, 26m).",
      };
    case "quant_numeric_entry":
      return {
        section: "Quantitative Reasoning",
        task: "Numeric Entry",
        pacingSeconds: 105,
        pacingLabel: "~1m 45s / Q",
        detail: "Type an exact integer, decimal, or fraction with no answer choices to eliminate.",
      };
    case "data_interpretation":
      return {
        section: "Quantitative Reasoning",
        task: "Data Interpretation",
        pacingSeconds: 120,
        pacingLabel: "~2m / Q",
        detail: "Read tables, charts, and percentages together; 2-3 linked questions appear per GRE Math section.",
      };
    case "text_completion": {
      const n = Object.keys(question.choices).length;
      return {
        section: "Verbal Reasoning",
        task: `Text Completion (${n}-Blank)`,
        pacingSeconds: n === 1 ? 60 : n === 2 ? 75 : 90,
        pacingLabel: n === 1 ? "~1m / Q" : n === 2 ? "~1m 15s / Q" : "~1m 30s / Q",
        detail: "Use sentence logic and contrast clues; all blanks must be right for credit.",
      };
    }
    case "sentence_equivalence":
      return {
        section: "Verbal Reasoning",
        task: "Sentence Equivalence",
        pacingSeconds: 60,
        pacingLabel: "~1m / Q",
        detail: "Select two words from six choices that produce sentences with the same overall meaning.",
      };
    case "reading_comprehension": {
      const sub = question.select_in_passage
        ? "Select-in-Passage"
        : question.select_all
          ? "Multiple-Answer (Select All)"
          : "Single-Choice";
      return {
        section: "Verbal Reasoning",
        task: `Reading Comprehension (${sub})`,
        pacingSeconds: 105,
        pacingLabel: "~1m 45s / Q",
        detail: "About half of GRE Verbal (27 Q across 2 adaptive sections) tests passage evidence, inference, and structure.",
      };
    }
  }
}

export function getCourseTrackExamTarget(track: string): string {
  const t = track.toLowerCase();
  if (t.includes("math") || t.includes("quant")) {
    return "Targets GRE Quantitative Reasoning (27 Q across 2 adaptive parts: 21m + 26m)";
  }
  if (t.includes("verbal")) {
    return "Targets GRE Verbal Reasoning (27 Q across 2 adaptive parts: 18m + 23m)";
  }
  if (t.includes("essay") || t.includes("writing") || t.includes("awa")) {
    return "Targets GRE Analytical Writing Section 1: Analyze an Issue (1 essay, 30 min)";
  }
  return "Targets overall Shortened GRE pacing and 2-stage adaptive strategy (1h 58m total)";
}
