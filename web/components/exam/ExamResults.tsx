"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  calculateAdaptiveGreScore,
  type AdaptiveDifficultyBand,
  type AnyQuestion,
  type Section,
} from "gre-adaptive-engine";
import { useAdaptiveState } from "@/lib/useAdaptiveState";

// Numeric-tolerant comparison matching fractions, decimals, and integer forms.
export function parseNumeric(value: string): number | null {
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

export function numericAnswersMatch(entered: string, expected: string): boolean {
  const enteredNum = parseNumeric(entered);
  const expectedNum = parseNumeric(expected);
  if (enteredNum !== null && expectedNum !== null)
    return Math.abs(enteredNum - expectedNum) < 1e-9;
  return entered.trim().toLowerCase() === expected.trim().toLowerCase();
}

export function evaluateQuestionAnswer(q: AnyQuestion, userAns: any): boolean {
  if (q.qtype === "quant_comparison") {
    return userAns === q.correct;
  }
  if (q.qtype === "quant_multiple_choice" || q.qtype === "data_interpretation") {
    return (
      Array.isArray(userAns) &&
      userAns.length === q.correct.length &&
      userAns.every((val) => q.correct.includes(val))
    );
  }
  if (q.qtype === "quant_numeric_entry") {
    return Boolean(userAns) && numericAnswersMatch(String(userAns), q.correct);
  }
  if (q.qtype === "text_completion") {
    if (!userAns || typeof userAns !== "object") return false;
    const blanks = Object.keys(q.correct);
    return blanks.every((b) => userAns[b] === q.correct[b]);
  }
  if (q.qtype === "sentence_equivalence") {
    return (
      Array.isArray(userAns) &&
      userAns.length === 2 &&
      userAns.every((val) => q.correct.includes(val))
    );
  }
  if (q.qtype === "reading_comprehension") {
    return (
      Array.isArray(userAns) &&
      userAns.length === q.correct.length &&
      userAns.every((val) => q.correct.includes(val))
    );
  }
  return false;
}

interface ExamResultsProps {
  section: Section;
  questions: AnyQuestion[];
  userAnswers: Record<string, any>;
  timeSpentSec: number;
  questionTimesSec?: Record<string, number>;
  sectionTitle: string;
  s1Count?: number;
  s1Correct?: number;
  s2Difficulty?: AdaptiveDifficultyBand;
  onRetake: () => void;
  onRetakeFresh?: () => void;
}

export default function ExamResults({
  section,
  questions,
  userAnswers,
  timeSpentSec,
  questionTimesSec = {},
  sectionTitle,
  s1Count,
  s1Correct,
  s2Difficulty,
  onRetake,
  onRetakeFresh,
}: ExamResultsProps) {
  const [selectedReviewIdx, setSelectedReviewIdx] = useState(0);
  const [onlyMistakes, setOnlyMistakes] = useState(false);
  const { recordAnswer, hydrated } = useAdaptiveState();
  const recordedRef = useRef(false);

  const questionResults = questions.map((q, idx) => {
    const userAns = userAnswers[q.id];
    const isCorrect = evaluateQuestionAnswer(q, userAns);
    const secSpent = questionTimesSec[q.id] ?? 0;
    const stageLabel = s1Count ? (idx < s1Count ? "S1" : "S2") : "S1";
    return { question: q, userAns, isCorrect, secSpent, stageLabel, origIdx: idx };
  });

  const correctCount = questionResults.filter((r) => r.isCorrect).length;

  useEffect(() => {
    if (!hydrated || recordedRef.current) return;
    recordedRef.current = true;
    for (const qr of questionResults) {
      recordAnswer(qr.question, qr.isCorrect);
    }
  }, [hydrated, questionResults, recordAnswer]);

  const total = Math.max(1, questions.length);
  const accuracyPct = Math.round((correctCount / total) * 100);
  const s2Correct = s1Correct !== undefined ? correctCount - s1Correct : 0;
  const estimatedScaledScore = s1Correct !== undefined && s2Difficulty
    ? calculateAdaptiveGreScore(section, s1Correct, s2Correct, s2Difficulty, total)
    : null;

  const minutes = Math.floor(timeSpentSec / 60);
  const seconds = timeSpentSec % 60;
  const avgSecPerQ = Math.round(timeSpentSec / total);
  const timeSinks = questionResults.filter((r) => r.secSpent >= 150);

  const filteredResults = onlyMistakes
    ? questionResults.filter((r) => !r.isCorrect)
    : questionResults;

  const safeIdx = Math.min(selectedReviewIdx, Math.max(0, filteredResults.length - 1));
  const activeReview = filteredResults[safeIdx];

  function formatAnswerDisplay(ans: any): string {
    if (ans === undefined || ans === null || ans === "") return "(Unanswered)";
    if (ans === "A") return "Quantity A is greater";
    if (ans === "B") return "Quantity B is greater";
    if (ans === "equal") return "The two quantities are equal";
    if (ans === "cannot_determine")
      return "The relationship cannot be determined from the information given";
    if (Array.isArray(ans)) return ans.join(", ");
    if (typeof ans === "object") {
      return Object.entries(ans)
        .map(([k, v]) => `Blank (${k}): ${v}`)
        .join(" | ");
    }
    return String(ans);
  }

  function formatPrompt(q: AnyQuestion): string {
    if (q.qtype === "quant_comparison") {
      return `${q.shared_info ? q.shared_info + " | " : ""}Qty A: ${q.quantity_a} vs Qty B: ${q.quantity_b}`;
    }
    if (q.qtype === "text_completion") return q.passage;
    if (q.qtype === "sentence_equivalence") return q.sentence;
    if (q.qtype === "reading_comprehension") return q.question;
    return q.prompt;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Summary Card */}
        <div className="bg-[#1b3a5b] text-white rounded-xl p-6 shadow-md">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Test Results
              </p>
              <h1 className="text-2xl font-bold mt-1">{sectionTitle}</h1>
              {s2Difficulty && s1Count && (
                <p className="text-sm text-blue-100 mt-1">
                  Part 1: <strong>{s1Correct}/{s1Count}</strong> &rarr;{" "}
                  <span
                    className={`px-2 py-0.5 rounded font-bold uppercase text-xs ${
                      s2Difficulty === "hard"
                        ? "bg-[#166534] text-white"
                        : s2Difficulty === "easy"
                        ? "bg-amber-400 text-black"
                        : "bg-sky-400 text-black"
                    }`}
                  >
                    {s2Difficulty} Part 2
                  </span>{" "}
                  ({s2Correct}/{total - s1Count})
                </p>
              )}
            </div>
            {estimatedScaledScore !== null && (
              <div className="text-right">
                <div className="text-xs text-blue-200">App score estimate</div>
                <div className="text-4xl font-extrabold text-amber-300">
                  {estimatedScaledScore} <span className="text-base font-normal text-blue-200">/ 170</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-blue-200">Correct</div>
              <div className="text-xl font-bold">
                {correctCount}/{total} ({accuracyPct}%)
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-blue-200">Total Time</div>
              <div className="text-xl font-bold font-mono">
                {minutes}m {String(seconds).padStart(2, "0")}s
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-blue-200">Avg / Question</div>
              <div className="text-xl font-bold font-mono">{avgSecPerQ}s</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-blue-200">Slow Questions (2.5m+)</div>
              <div className={`text-xl font-bold ${timeSinks.length > 0 ? "text-amber-300" : "text-emerald-300"}`}>
                {timeSinks.length}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-5">
            <Link
              href="/tests"
              className="px-4 py-2 bg-white text-[#1b3a5b] font-bold rounded-lg text-sm hover:bg-blue-50 transition"
            >
              &larr; Timed tests
            </Link>
            <button
              onClick={onRetake}
              className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white font-bold rounded-lg text-sm transition"
            >
              Retry this set
            </button>
            {onRetakeFresh && (
              <button
                onClick={onRetakeFresh}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-lg text-sm transition"
              >
                Try a new set
              </button>
            )}
          </div>
        </div>

        {/* Question-by-Question Review & Mistake Filter */}
        <div className="bg-white rounded-xl border border-gray-300 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-3">
            <h2 className="text-lg font-bold">Review Questions</h2>
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={onlyMistakes}
                onChange={(e) => {
                  setOnlyMistakes(e.target.checked);
                  setSelectedReviewIdx(0);
                }}
              />
              Show Mistakes Only ({total - correctCount})
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {filteredResults.map((qr, i) => (
              <button
                key={qr.question.id + "-" + qr.origIdx}
                type="button"
                onClick={() => setSelectedReviewIdx(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  safeIdx === i ? "ring-2 ring-[#1b3a5b]" : ""
                } ${
                  qr.isCorrect
                    ? "bg-emerald-50 border-emerald-400 text-emerald-900"
                    : "bg-red-50 border-red-400 text-red-900"
                }`}
              >
                {qr.stageLabel}·Q{qr.origIdx + 1}{" "}
                {qr.secSpent > 0 ? `(${qr.secSpent}s${qr.secSpent >= 150 ? ", slow" : ""})` : ""}
              </button>
            ))}
          </div>

          {activeReview ? (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-wrap justify-between items-center text-xs text-gray-500 uppercase font-bold">
                <span>
                  {activeReview.stageLabel} · Question {activeReview.origIdx + 1} ·{" "}
                  {activeReview.question.topic.replace(/_/g, " ")} (Difficulty {activeReview.question.difficulty}/5)
                </span>
                <span>
                  Time spent: {activeReview.secSpent}s{" "}
                  {activeReview.secSpent >= 150 ? "(2.5 minutes or more)" : ""}
                </span>
              </div>

              <p className="font-serif text-base text-gray-900 leading-relaxed">
                {formatPrompt(activeReview.question)}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div
                  className={`p-3 rounded-lg border ${
                    activeReview.isCorrect
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : "bg-red-50 border-red-300 text-red-900"
                  }`}
                >
                  <strong>Your Answer:</strong> {formatAnswerDisplay(activeReview.userAns)}
                </div>
                <div className="p-3 rounded-lg border bg-blue-50 border-blue-300 text-blue-900">
                  <strong>Correct Answer:</strong> {formatAnswerDisplay(activeReview.question.correct)}
                </div>
              </div>

              <div className="p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-800">
                <strong>Explanation:</strong> {activeReview.question.explanation}
              </div>
            </div>
          ) : (
            <p className="text-sm text-emerald-700 font-semibold">
              No missed questions in this test.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
