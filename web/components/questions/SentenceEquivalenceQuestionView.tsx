"use client";

import { useState } from "react";
import type { SentenceEquivalenceQuestion } from "gre-adaptive-engine";

export default function SentenceEquivalenceQuestionView({
  question,
  onAnswered,
}: {
  question: SentenceEquivalenceQuestion;
  onAnswered: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const correctSet = new Set(question.correct);
  const isCorrect = selected.length === 2 && selected.every((c) => correctSet.has(c));

  function toggle(choice: string) {
    setSelected((prev) => {
      if (prev.includes(choice)) return prev.filter((c) => c !== choice);
      if (prev.length >= 2) return prev; // sentence equivalence always asks for exactly two
      return [...prev, choice];
    });
  }

  function handleSubmit() {
    setSubmitted(true);
    onAnswered(isCorrect);
  }

  return (
    <div className="question">
      <p className="prompt">{question.sentence}</p>
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
                <input type="checkbox" checked={isSelected} disabled={submitted} onChange={() => toggle(choice)} />
                {choice}
              </label>
            </li>
          );
        })}
      </ul>

      {!submitted && (
        <button className="button" disabled={selected.length !== 2} onClick={handleSubmit}>
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
