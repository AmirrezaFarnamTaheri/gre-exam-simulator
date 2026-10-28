"use client";

import { useState } from "react";
import type { QuantNumericEntryQuestion } from "gre-adaptive-engine";

function parseNumeric(value: string): number | null {
  const trimmed = value.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  const fractionMatch = trimmed.match(/^(-?\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (denominator !== 0) return numerator / denominator;
  }
  return null;
}

function answersMatch(entered: string, expected: string): boolean {
  const enteredNum = parseNumeric(entered);
  const expectedNum = parseNumeric(expected);
  if (enteredNum !== null && expectedNum !== null) return Math.abs(enteredNum - expectedNum) < 1e-9;
  return entered.trim() === expected.trim();
}

export default function QuantNumericEntryQuestionView({
  question,
  onAnswered,
}: {
  question: QuantNumericEntryQuestion;
  onAnswered: (correct: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = answersMatch(value, question.correct);

  function handleSubmit() {
    setSubmitted(true);
    onAnswered(isCorrect);
  }

  return (
    <div className="question">
      <p className="prompt">{question.prompt}</p>
      <input
        type="text"
        className="numeric-input"
        value={value}
        disabled={submitted}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Your answer"
      />

      {!submitted && (
        <button className="button" disabled={value.trim() === ""} onClick={handleSubmit}>
          Check Answer
        </button>
      )}

      {submitted && (
        <div className={isCorrect ? "feedback correct" : "feedback incorrect"}>
          <p>
            {isCorrect ? "Correct!" : "Not quite."} Correct answer: <strong>{question.correct}</strong>
          </p>
          <p className="explanation">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
