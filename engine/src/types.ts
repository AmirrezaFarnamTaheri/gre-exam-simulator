/** Mirrors pipeline/schema.py. Keep these in sync if the Python schema changes. */

export type Section = "verbal" | "quant";
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type QuestionSource = "seed" | "llm";

interface QuestionBase {
  id: string;
  section: Section;
  qtype: string;
  topic: string;
  difficulty: Difficulty;
  explanation: string;
  source: QuestionSource;
  tags: string[];
}

export interface TextCompletionQuestion extends QuestionBase {
  section: "verbal";
  qtype: "text_completion";
  passage: string;
  choices: Record<string, string[]>;
  correct: Record<string, string>;
}

export interface SentenceEquivalenceQuestion extends QuestionBase {
  section: "verbal";
  qtype: "sentence_equivalence";
  sentence: string;
  choices: string[];
  correct: string[];
}

export interface ReadingComprehensionQuestion extends QuestionBase {
  section: "verbal";
  qtype: "reading_comprehension";
  passage_id: string;
  question: string;
  choices: string[];
  correct: string[];
  select_all: boolean;
}

export interface Passage {
  id: string;
  title: string;
  text: string;
  source: "original" | "public_domain";
}

export interface QuantComparisonQuestion extends QuestionBase {
  section: "quant";
  qtype: "quant_comparison";
  quantity_a: string;
  quantity_b: string;
  shared_info?: string | null;
  correct: "A" | "B" | "equal" | "cannot_determine";
}

export interface QuantMultipleChoiceQuestion extends QuestionBase {
  section: "quant";
  qtype: "quant_multiple_choice";
  prompt: string;
  choices: string[];
  correct: string[];
  select_all: boolean;
}

export interface QuantNumericEntryQuestion extends QuestionBase {
  section: "quant";
  qtype: "quant_numeric_entry";
  prompt: string;
  correct: string;
}

export type AnyQuestion =
  | TextCompletionQuestion
  | SentenceEquivalenceQuestion
  | ReadingComprehensionQuestion
  | QuantComparisonQuestion
  | QuantMultipleChoiceQuestion
  | QuantNumericEntryQuestion;

/** Per-topic ability estimate and interaction history. */
export interface TopicStat {
  rating: number;
  attempts: number;
  correct: number;
  lastSeenAt: number | null;
  /** Most recently answered question ids in this topic, capped, used to avoid immediate repeats. */
  recentQuestionIds: string[];
}

export interface AttemptRecord {
  questionId: string;
  section: Section;
  topic: string;
  difficulty: Difficulty;
  correct: boolean;
  timestamp: number;
  ratingBefore: number;
  ratingAfter: number;
}

export interface AdaptiveState {
  version: 1;
  sectionRatings: Record<Section, number>;
  topicStats: Record<string, TopicStat>;
  attempts: AttemptRecord[];
}
