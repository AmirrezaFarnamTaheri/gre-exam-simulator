"use client";

import React from "react";
import type {
  AnyQuestion,
  QuantComparisonQuestion,
  QuantMultipleChoiceQuestion,
  QuantNumericEntryQuestion,
  TextCompletionQuestion,
  SentenceEquivalenceQuestion,
  ReadingComprehensionQuestion,
} from "gre-adaptive-engine";
import { getPassageById } from "@/lib/questionBank";

interface ExamQuestionRendererProps {
  question: AnyQuestion;
  currentAnswer: any;
  onAnswerChange: (ans: any) => void;
  calculatorTransferVal?: string | null;
}

export default function ExamQuestionRenderer({
  question,
  currentAnswer,
  onAnswerChange,
  calculatorTransferVal,
}: ExamQuestionRendererProps) {
  // Transfer display into numeric entry if available
  React.useEffect(() => {
    if (
      calculatorTransferVal &&
      question.qtype === "quant_numeric_entry"
    ) {
      onAnswerChange(calculatorTransferVal);
    }
  }, [calculatorTransferVal, question.qtype]);

  if (question.qtype === "quant_comparison") {
    return (
      <QuantComparisonExamView
        q={question}
        answer={currentAnswer}
        onChange={onAnswerChange}
      />
    );
  }

  if (question.qtype === "quant_multiple_choice") {
    return (
      <QuantMultipleChoiceExamView
        q={question}
        answer={currentAnswer}
        onChange={onAnswerChange}
      />
    );
  }

  if (question.qtype === "quant_numeric_entry") {
    return (
      <QuantNumericEntryExamView
        q={question}
        answer={currentAnswer}
        onChange={onAnswerChange}
      />
    );
  }

  if (question.qtype === "text_completion") {
    return (
      <TextCompletionExamView
        q={question}
        answer={currentAnswer}
        onChange={onAnswerChange}
      />
    );
  }

  if (question.qtype === "sentence_equivalence") {
    return (
      <SentenceEquivalenceExamView
        q={question}
        answer={currentAnswer}
        onChange={onAnswerChange}
      />
    );
  }

  if (question.qtype === "reading_comprehension") {
    return (
      <ReadingComprehensionExamView
        q={question}
        answer={currentAnswer}
        onChange={onAnswerChange}
      />
    );
  }

  return <div>Unsupported question type</div>;
}

function QuantComparisonExamView({
  q,
  answer,
  onChange,
}: {
  q: QuantComparisonQuestion;
  answer?: string;
  onChange: (val: string) => void;
}) {
  const options = [
    { key: "A", label: "Quantity A is greater." },
    { key: "B", label: "Quantity B is greater." },
    { key: "equal", label: "The two quantities are equal." },
    {
      key: "cannot_determine",
      label: "The relationship cannot be determined from the information given.",
    },
  ];

  return (
    <div className="space-y-6">
      {q.shared_info && (
        <div className="p-4 bg-gray-50 border border-gray-300 rounded font-serif text-lg leading-relaxed text-gray-800">
          {q.shared_info}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-300 rounded-lg p-5">
        <div className="border-r border-slate-300 pr-4">
          <span className="block font-sans font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
            Quantity A
          </span>
          <div className="font-serif text-lg font-medium text-gray-900">
            {q.quantity_a}
          </div>
        </div>
        <div className="pl-2">
          <span className="block font-sans font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
            Quantity B
          </span>
          <div className="font-serif text-lg font-medium text-gray-900">
            {q.quantity_b}
          </div>
        </div>
      </div>

      <div className="space-y-2.5 pt-2">
        {options.map((opt) => (
          <label
            key={opt.key}
            className={`flex items-center gap-3 p-3.5 border rounded-lg cursor-pointer transition select-none ${
              answer === opt.key
                ? "bg-blue-50 border-blue-600 shadow-sm"
                : "bg-white border-gray-300 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="qc_choice"
              checked={answer === opt.key}
              onChange={() => onChange(opt.key)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="font-serif text-base text-gray-900">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function QuantMultipleChoiceExamView({
  q,
  answer,
  onChange,
}: {
  q: QuantMultipleChoiceQuestion;
  answer?: string[];
  onChange: (val: string[]) => void;
}) {
  const current = answer || [];

  function handleSelect(choice: string) {
    if (q.select_all) {
      if (current.includes(choice)) {
        onChange(current.filter((c) => c !== choice));
      } else {
        onChange([...current, choice]);
      }
    } else {
      onChange([choice]);
    }
  }

  return (
    <div className="space-y-6">
      <div className="font-serif text-lg leading-relaxed text-gray-900">
        {q.prompt}
      </div>

      {q.select_all && (
        <div className="text-xs font-sans font-bold uppercase tracking-wide text-blue-800 bg-blue-50 p-2 border border-blue-200 rounded">
          Indicate all such values.
        </div>
      )}

      <div className="space-y-2.5">
        {q.choices.map((choice) => {
          const isSelected = current.includes(choice);
          return (
            <label
              key={choice}
              onClick={() => handleSelect(choice)}
              className={`flex items-center gap-3 p-3.5 border rounded-lg cursor-pointer transition select-none ${
                isSelected
                  ? "bg-blue-50 border-blue-600 shadow-sm"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type={q.select_all ? "checkbox" : "radio"}
                name="mc_choice"
                checked={isSelected}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600"
              />
              <span className="font-serif text-base text-gray-900">{choice}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function QuantNumericEntryExamView({
  q,
  answer,
  onChange,
}: {
  q: QuantNumericEntryQuestion;
  answer?: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="font-serif text-lg leading-relaxed text-gray-900">
        {q.prompt}
      </div>

      <div className="pt-2">
        <label className="block text-xs font-sans font-bold uppercase tracking-wide text-gray-600 mb-2">
          Enter your answer below:
        </label>
        <input
          type="text"
          value={answer || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 15 or 3.25"
          className="border-2 border-gray-400 rounded-md p-3 font-mono text-xl w-48 text-center focus:outline-none focus:border-blue-600 bg-white shadow-inner"
        />
      </div>
    </div>
  );
}

function TextCompletionExamView({
  q,
  answer,
  onChange,
}: {
  q: TextCompletionQuestion;
  answer?: Record<string, string>;
  onChange: (val: Record<string, string>) => void;
}) {
  const current = answer || {};
  const blanks = Object.keys(q.choices);

  function handlePick(blank: string, choice: string) {
    onChange({ ...current, [blank]: choice });
  }

  return (
    <div className="space-y-6">
      <div className="font-serif text-lg leading-relaxed text-gray-900 p-4 bg-slate-50 border border-slate-200 rounded">
        {q.passage}
      </div>

      <div className={`grid grid-cols-${blanks.length} gap-4`}>
        {blanks.map((b) => (
          <div key={b} className="border border-gray-300 rounded-lg p-3 bg-white">
            <h4 className="font-sans font-bold text-xs uppercase tracking-wide text-gray-600 mb-3 text-center border-b pb-1.5">
              Blank ({b})
            </h4>
            <div className="space-y-2">
              {q.choices[b].map((c) => {
                const isSelected = current[b] === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handlePick(b, c)}
                    className={`w-full text-left p-2.5 rounded border text-sm font-serif transition ${
                      isSelected
                        ? "bg-blue-50 border-blue-600 text-blue-900 font-bold"
                        : "border-gray-200 hover:bg-gray-50 text-gray-800"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SentenceEquivalenceExamView({
  q,
  answer,
  onChange,
}: {
  q: SentenceEquivalenceQuestion;
  answer?: string[];
  onChange: (val: string[]) => void;
}) {
  const current = answer || [];

  function toggle(choice: string) {
    if (current.includes(choice)) {
      onChange(current.filter((c) => c !== choice));
    } else {
      if (current.length < 2) {
        onChange([...current, choice]);
      } else {
        // Replace oldest or toggle
        onChange([current[1], choice]);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="font-serif text-lg leading-relaxed text-gray-900 p-4 bg-slate-50 border border-slate-200 rounded">
        {q.sentence}
      </div>

      <div className="text-xs font-sans font-bold uppercase tracking-wide text-blue-800 bg-blue-50 p-2 border border-blue-200 rounded">
        Select the TWO answer choices that produce sentences that are alike in meaning.
      </div>

      <div className="space-y-2.5">
        {q.choices.map((choice) => {
          const isSelected = current.includes(choice);
          return (
            <label
              key={choice}
              onClick={() => toggle(choice)}
              className={`flex items-center gap-3 p-3.5 border rounded-lg cursor-pointer transition select-none ${
                isSelected
                  ? "bg-blue-50 border-blue-600 shadow-sm"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600"
              />
              <span className="font-serif text-base text-gray-900">{choice}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ReadingComprehensionExamView({
  q,
  answer,
  onChange,
}: {
  q: ReadingComprehensionQuestion;
  answer?: string[];
  onChange: (val: string[]) => void;
}) {
  const passage = getPassageById(q.passage_id);
  const current = answer || [];

  function handleSelect(choice: string) {
    if (q.select_all) {
      if (current.includes(choice)) {
        onChange(current.filter((c) => c !== choice));
      } else {
        onChange([...current, choice]);
      }
    } else {
      onChange([choice]);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="border border-gray-300 rounded-lg p-5 bg-white overflow-y-auto max-h-[550px] shadow-sm">
        <h3 className="font-sans font-bold text-xs uppercase tracking-wide text-gray-500 mb-3">
          Passage: {passage.title}
        </h3>
        <p className="font-serif text-base leading-relaxed text-gray-800 whitespace-pre-line">
          {passage.text}
        </p>
      </div>

      <div className="space-y-5">
        <div className="font-serif text-lg leading-relaxed text-gray-900">
          {q.question}
        </div>

        {q.select_all && (
          <div className="text-xs font-sans font-bold uppercase tracking-wide text-blue-800 bg-blue-50 p-2 border border-blue-200 rounded">
            Select all choices that apply.
          </div>
        )}

        <div className="space-y-2.5">
          {q.choices.map((choice) => {
            const isSelected = current.includes(choice);
            return (
              <label
                key={choice}
                onClick={() => handleSelect(choice)}
                className={`flex items-center gap-3 p-3.5 border rounded-lg cursor-pointer transition select-none ${
                  isSelected
                    ? "bg-blue-50 border-blue-600 shadow-sm"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type={q.select_all ? "checkbox" : "radio"}
                  checked={isSelected}
                  onChange={() => {}}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="font-serif text-base text-gray-900">{choice}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
