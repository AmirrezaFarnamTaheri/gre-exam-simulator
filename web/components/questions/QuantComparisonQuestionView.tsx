"use client";

import { useState } from "react";
import type { QuantComparisonQuestion } from "gre-adaptive-engine";

const OPTIONS: { value: QuantComparisonQuestion["correct"]; label: string }[] = [
  { value: "A", label: "Quantity A is greater" },
  { value: "B", label: "Quantity B is greater" },
  { value: "equal", label: "The two quantities are equal" },
  { value: "cannot_determine", label: "The relationship cannot be determined from the information given" },
];

export default function QuantComparisonQuestionView({
  question,
  onAnswered,
}: {
  question: QuantComparisonQuestion;
  onAnswered: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<QuantComparisonQuestion["correct"] | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected === question.correct;

  function handleSubmit() {
    if (!selected) return;
    setSubmitted(true);
    onAnswered(isCorrect);
  }

  return (
    <div className="question">
      {question.shared_info && <p className="shared-info">{question.shared_info}</p>}
      <div className="quantities">
        <div className="quantity">
          <h4>Quantity A</h4>
          <p>{question.quantity_a}</p>
        </div>
        <div className="quantity">
          <h4>Quantity B</h4>
          <p>{question.quantity_b}</p>
        </div>
      </div>

      <ul className="choice-list">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          const isCorrectChoice = submitted && opt.value === question.correct;
          const className = submitted
            ? isCorrectChoice
              ? "choice correct"
              : isSelected
                ? "choice incorrect"
                : "choice"
            : "choice";
          return (
            <li key={opt.value}>
              <label className={className}>
                <input
                  type="radio"
                  name="qc-choice"
                  checked={isSelected}
                  disabled={submitted}
                  onChange={() => setSelected(opt.value)}
                />
                {opt.label}
              </label>
            </li>
          );
        })}
      </ul>

      {!submitted && (
        <button className="button" disabled={!selected} onClick={handleSubmit}>
          Check Answer
        </button>
      )}

      {submitted && (
        <div className={isCorrect ? "feedback correct" : "feedback incorrect"}>
          <p>{isCorrect ? "Correct!" : "Not quite."}</p>
          <p className="explanation">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
