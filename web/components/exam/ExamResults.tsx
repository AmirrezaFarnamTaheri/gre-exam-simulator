"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { AnyQuestion } from "gre-adaptive-engine";

interface ExamResultsProps {
  questions: AnyQuestion[];
  userAnswers: Record<string, any>;
  timeSpentSec: number;
  sectionTitle: string;
  onRetake: () => void;
}

export default function ExamResults({
  questions,
  userAnswers,
  timeSpentSec,
  sectionTitle,
  onRetake,
}: ExamResultsProps) {
  const [selectedReviewIdx, setSelectedReviewIdx] = useState(0);

  // Score validation
  let correctCount = 0;
  const questionResults = questions.map((q) => {
    const userAns = userAnswers[q.id];
    let isCorrect = false;

    if (q.qtype === "quant_comparison") {
      isCorrect = userAns === q.correct;
    } else if (q.qtype === "quant_multiple_choice") {
      if (Array.isArray(userAns)) {
        isCorrect =
          userAns.length === q.correct.length &&
          userAns.every((val) => q.correct.includes(val));
      }
    } else if (q.qtype === "quant_numeric_entry") {
      if (userAns) {
        isCorrect =
          userAns.trim().toLowerCase() === q.correct.trim().toLowerCase();
      }
    } else if (q.qtype === "text_completion") {
      if (userAns && typeof userAns === "object") {
        const blanks = Object.keys(q.correct);
        isCorrect = blanks.every((b) => userAns[b] === q.correct[b]);
      }
    } else if (q.qtype === "sentence_equivalence") {
      if (Array.isArray(userAns)) {
        isCorrect =
          userAns.length === 2 &&
          userAns.every((val) => q.correct.includes(val));
      }
    } else if (q.qtype === "reading_comprehension") {
      if (Array.isArray(userAns)) {
        isCorrect =
          userAns.length === q.correct.length &&
          userAns.every((val) => q.correct.includes(val));
      }
    }

    if (isCorrect) correctCount++;
    return { question: q, userAns, isCorrect };
  });

  const total = questions.length;
  const accuracyPct = Math.round((correctCount / total) * 100);
  const estimatedScaledScore = 130 + Math.round(40 * (correctCount / total));

  const minutes = Math.floor(timeSpentSec / 60);
  const seconds = timeSpentSec % 60;
  const avgSecPerQ = Math.round(timeSpentSec / total);

  const activeReview = questionResults[selectedReviewIdx];

  function formatAnswerDisplay(ans: any): string {
    if (ans === undefined || ans === null || ans === "") return "(Unanswered)";
    if (Array.isArray(ans)) return ans.join(", ");
    if (typeof ans === "object") {
      return Object.entries(ans)
        .map(([k, v]) => `Blank ${k}: ${v}`)
        .join(" | ");
    }
    return String(ans);
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 font-sans space-y-8">
      {/* Score Header */}
      <div className="bg-[#1b3a5b] text-white rounded-xl shadow-lg p-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-200">
            OFFICIAL SECTION SCORE REPORT
          </span>
          <h1 className="text-2xl font-bold mt-1">{sectionTitle}</h1>
          <p className="text-sm text-gray-200 mt-1">
            Completed in {minutes}m {seconds}s (Avg {avgSecPerQ}s / question)
          </p>
        </div>

        <div className="flex items-center gap-6 text-center">
          <div className="bg-white/10 px-5 py-3 rounded-lg border border-white/20">
            <span className="block text-xs uppercase tracking-wider text-blue-200 font-bold">
              Raw Score
            </span>
            <span className="text-3xl font-extrabold">
              {correctCount} / {total}
            </span>
            <span className="block text-xs text-blue-100">{accuracyPct}% accuracy</span>
          </div>

          <div className="bg-white text-[#1b3a5b] px-6 py-3 rounded-lg shadow-md">
            <span className="block text-xs uppercase tracking-wider font-extrabold text-gray-600">
              Estimated Scaled Score
            </span>
            <span className="text-4xl font-black">{estimatedScaledScore}</span>
            <span className="block text-xs text-gray-500 font-medium">
              Scale 130 – 170
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <Link
          href="/"
          className="text-sm font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
        >
          &larr; Return to Dashboard
        </Link>
        <div className="flex gap-3">
          <button
            onClick={onRetake}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-bold rounded-lg transition"
          >
            Retake Section
          </button>
        </div>
      </div>

      {/* Review Navigator & Question Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Question List */}
        <div className="border border-gray-300 rounded-xl bg-white p-4 shadow-sm h-fit">
          <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wider mb-3">
            Questions ({correctCount}/{total} Correct)
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {questionResults.map((qr, idx) => (
              <button
                key={qr.question.id}
                onClick={() => setSelectedReviewIdx(idx)}
                className={`p-2.5 rounded-lg text-sm font-bold border transition flex flex-col items-center justify-center ${
                  selectedReviewIdx === idx ? "ring-2 ring-blue-600 shadow" : ""
                } ${
                  qr.isCorrect
                    ? "bg-green-50 border-green-400 text-green-800 hover:bg-green-100"
                    : "bg-red-50 border-red-400 text-red-800 hover:bg-red-100"
                }`}
              >
                <span>Q{idx + 1}</span>
                <span className="text-[10px]">{qr.isCorrect ? "✓" : "✗"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Question Detail & Explanation */}
        <div className="md:col-span-2 border border-gray-300 rounded-xl bg-white p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-start border-b pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Question {selectedReviewIdx + 1} Breakdown
              </span>
              <h2 className="text-base font-bold text-gray-900 capitalize">
                Topic: {activeReview.question.topic.replace(/_/g, " ")} (Difficulty {activeReview.question.difficulty}/5)
              </h2>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                activeReview.isCorrect
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {activeReview.isCorrect ? "Correct" : "Incorrect"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <span className="block text-xs font-bold text-gray-500 uppercase">
                Your Answer
              </span>
              <span
                className={`font-semibold ${
                  activeReview.isCorrect ? "text-green-700" : "text-red-700"
                }`}
              >
                {formatAnswerDisplay(activeReview.userAns)}
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-500 uppercase">
                Correct Answer
              </span>
              <span className="font-semibold text-green-800">
                {formatAnswerDisplay(activeReview.question.correct)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
              ETS Step-by-Step Explanation
            </h4>
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-lg text-sm text-gray-900 leading-relaxed font-serif">
              {activeReview.question.explanation}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
