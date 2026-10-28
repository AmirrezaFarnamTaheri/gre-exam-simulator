"use client";

import { useState } from "react";
import type { TextCompletionQuestion } from "gre-adaptive-engine";

export default function TextCompletionQuestionView({
  question,
  onAnswered,
}: {
  question: TextCompletionQuestion;
  onAnswered: (correct: boolean) => void;
}) {
  const blankKeys = Object.keys(question.choices);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const allSelected = blankKeys.every((k) => selections[k]);
  const isCorrect = blankKeys.every((k) => selections[k] === question.correct[k]);

  function handleSubmit() {
    setSubmitted(true);
    onAnswered(isCorrect);
  }

  // Drop the "______" that follows each (i)/(ii) marker in the source text --
  // the <select> itself is the visual blank, so the underscores would otherwise
  // render redundantly right next to it.
  const passageWithoutUnderscores = question.passage.replace(/(\([ivx]+\))_+/gi, "$1");
  const segments = passageWithoutUnderscores.split(/(\([ivx]+\))/i);

  return (
    <div className="question">
      <p className="passage">
        {segments.map((segment, idx) => {
          const match = segment.match(/^\(([ivx]+)\)$/i);
          if (!match) return <span key={idx}>{segment}</span>;
          const key = match[1].toLowerCase();
          return (
            <select
              key={idx}
              className="blank-select"
              value={selections[key] ?? ""}
              disabled={submitted}
              onChange={(e) => setSelections((prev) => ({ ...prev, [key]: e.target.value }))}
            >
              <option value="" disabled>
                ({key})
              </option>
              {question.choices[key].map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          );
        })}
      </p>

      {!submitted && (
        <button className="button" disabled={!allSelected} onClick={handleSubmit}>
          Check Answer
        </button>
      )}

      {submitted && (
        <div className={isCorrect ? "feedback correct" : "feedback incorrect"}>
          <p>{isCorrect ? "Correct!" : "Not quite."}</p>
          <ul>
            {blankKeys.map((k) => (
              <li key={k}>
                Blank ({k}): correct answer is <strong>{question.correct[k]}</strong>
              </li>
            ))}
          </ul>
          <p className="explanation">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
