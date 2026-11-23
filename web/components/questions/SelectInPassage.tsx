"use client";

import type { Passage, ReadingComprehensionQuestion } from "gre-adaptive-engine";

export default function SelectInPassage({ passage, question, selected, submitted = false, onSelect }: {
  passage: Passage;
  question: ReadingComprehensionQuestion;
  selected?: string;
  submitted?: boolean;
  onSelect: (sentence: string) => void;
}) {
  return (
    <fieldset className="select-in-passage">
      <legend>{question.question}</legend>
      <h2>{passage.title}</h2>
      {question.choices.map((sentence) => {
        const correct = submitted && question.correct.includes(sentence);
        const incorrect = submitted && selected === sentence && !correct;
        return (
          <label key={sentence} className={`passage-sentence${correct ? " correct" : incorrect ? " incorrect" : ""}`}>
            <input
              type="radio"
              name={question.id}
              checked={selected === sentence}
              onChange={() => onSelect(sentence)}
              disabled={submitted}
            />
            <span>{sentence}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

