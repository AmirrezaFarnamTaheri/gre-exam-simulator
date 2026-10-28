"use client";

import type { AnyQuestion } from "gre-adaptive-engine";
import TextCompletionQuestionView from "./TextCompletionQuestionView";
import SentenceEquivalenceQuestionView from "./SentenceEquivalenceQuestionView";
import ReadingComprehensionQuestionView from "./ReadingComprehensionQuestionView";
import QuantComparisonQuestionView from "./QuantComparisonQuestionView";
import QuantMultipleChoiceQuestionView from "./QuantMultipleChoiceQuestionView";
import QuantNumericEntryQuestionView from "./QuantNumericEntryQuestionView";

export default function QuestionRenderer({
  question,
  onAnswered,
}: {
  question: AnyQuestion;
  onAnswered: (correct: boolean) => void;
}) {
  switch (question.qtype) {
    case "text_completion":
      return <TextCompletionQuestionView question={question} onAnswered={onAnswered} />;
    case "sentence_equivalence":
      return <SentenceEquivalenceQuestionView question={question} onAnswered={onAnswered} />;
    case "reading_comprehension":
      return <ReadingComprehensionQuestionView question={question} onAnswered={onAnswered} />;
    case "quant_comparison":
      return <QuantComparisonQuestionView question={question} onAnswered={onAnswered} />;
    case "quant_multiple_choice":
      return <QuantMultipleChoiceQuestionView question={question} onAnswered={onAnswered} />;
    case "quant_numeric_entry":
      return <QuantNumericEntryQuestionView question={question} onAnswered={onAnswered} />;
    default: {
      // Exhaustiveness check: a compile error here means a qtype was added
      // without a corresponding view component.
      const exhaustiveCheck: never = question;
      return exhaustiveCheck;
    }
  }
}
