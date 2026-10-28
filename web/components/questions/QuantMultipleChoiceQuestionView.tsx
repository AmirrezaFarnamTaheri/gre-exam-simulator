"use client";

import { useState } from "react";
import type { QuantMultipleChoiceQuestion } from "gre-adaptive-engine";

export default function QuantMultipleChoiceQuestionView({
  question,
  onAnswered,
}: {
  question: QuantMultipleChoiceQuestion;
  onAnswered: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const correctSet = new Set(question.correct);
  const isCorrect = selected.length === question.correct.length && selected.every((c) => correctSet.has(c));

  function toggle(choice: string) {
    if (question.select_all) {
      setSelected((prev) => (prev.includes(choice) ? prev.filter((c) => c !== choice) : [...prev, choice]));
    } else {
      setSelected([choice]);
    }
  }

  function handleSubmit() {
    setSubmitted(true);
    onAnswered(isCorrect);
  }

  return (
    <div className="question">
      <p className="prompt">{question.prompt}</p>
      <ul className="choice-list">
        {question.choices.map((choice) => {
          const isSelected = selected.includes(choice);
          const isCorrectChoice = submitted && correctSet.has(choice);
          const className = submitted
            ? isCorrectChoice
              ? "choice correct"
              : isSelected
                ? "choice incorrect"
                : "choice"
            : "choice";
          return (
            <li key={choice}>
              <label className={className}>
                <input
                  type={question.select_all ? "checkbox" : "radio"}
                  name="mc-choice"
                  checked={isSelected}
                  disabled={submitted}
                  onChange={() => toggle(choice)}
                />
                {choice}
              </label>
            </li>
          );
        })}
      </ul>

      {!submitted && (
        <button className="button" disabled={selected.length === 0} onClick={handleSubmit}>
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
