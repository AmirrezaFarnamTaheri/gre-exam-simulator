"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnyQuestion, Section } from "gre-adaptive-engine";
import { BANK } from "@/lib/questionBank";
import GRECalculator from "./GRECalculator";
import ReviewModal from "./ReviewModal";
import ExamQuestionRenderer from "./ExamQuestionRenderer";
import ExamResults from "./ExamResults";

interface ExamSessionProps {
  section: Section;
  questionCount?: number;
  durationMinutes?: number;
}

export default function ExamSession({
  section,
  questionCount = 12,
  durationMinutes = 21,
}: ExamSessionProps) {
  const router = useRouter();

  // Test setup
  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Record<string, boolean>>({});

  // Tool states
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calcTransferVal, setCalcTransferVal] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Timer state
  const totalSeconds = durationMinutes * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [isTimerHidden, setIsTimerHidden] = useState(false);

  // Question sampling
  function sampleQuestions() {
    const pool = BANK.filter((q) => q.section === section);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, questionCount);
  }

  // Initialize questions
  useEffect(() => {
    setQuestions(sampleQuestions());
    setSecondsRemaining(durationMinutes * 60);
  }, [section, questionCount, durationMinutes]);

  // Countdown timer
  useEffect(() => {
    if (isFinished || questions.length === 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinished, questions.length]);

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans bg-gray-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-md border">
          <h2 className="text-lg font-bold text-gray-800">Initializing Exam Section...</h2>
          <p className="text-sm text-gray-500 mt-2">Calibrating ETS question parameters...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isMarked = !!markedQuestions[currentQ.id];

  const minutesLeft = Math.floor(secondsRemaining / 60);
  const secondsLeft = secondsRemaining % 60;
  const isTimeLow = secondsRemaining < 300; // < 5 mins

  function handleAnswerChange(ans: any) {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: ans,
    }));
    // Reset transfer val once applied
    setCalcTransferVal(null);
  }

  function toggleMark() {
    setMarkedQuestions((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  }

  function handleCalculatorTransfer(val: string) {
    setCalcTransferVal(val);
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowSubmitConfirm(true);
    }
  }

  function handleBack() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  function handleRetake(fresh = false) {
    if (fresh) {
      setQuestions(sampleQuestions());
    }
    setIsFinished(false);
    setSecondsRemaining(totalSeconds);
    setUserAnswers({});
    setMarkedQuestions({});
    setCurrentIndex(0);
  }

  // Count unanswered questions
  const unansweredCount = questions.filter((q) => {
    const ans = userAnswers[q.id];
    if (ans === undefined || ans === null || ans === "") return true;
    if (q.qtype === "text_completion") {
      if (!ans || typeof ans !== "object") return true;
      const reqBlanks = Object.keys(q.choices);
      return !reqBlanks.every((b) => !!ans[b]);
    }
    if (q.qtype === "sentence_equivalence") {
      return !Array.isArray(ans) || ans.length !== 2;
    }
    if (Array.isArray(ans)) return ans.length === 0;
    return false;
  }).length;

  if (isFinished) {
    const timeSpent = totalSeconds - secondsRemaining;
    const title =
      section === "quant"
        ? "Section 1: Quantitative Reasoning"
        : "Section 1: Verbal Reasoning";

    return (
      <ExamResults
        questions={questions}
        userAnswers={userAnswers}
        timeSpentSec={timeSpent}
        sectionTitle={title}
        onRetake={() => handleRetake(false)}
        onRetakeFresh={() => handleRetake(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900 font-sans flex flex-col justify-between">
      {/* ETS Top Header Toolbar */}
      <header className="bg-[#1b3a5b] text-white select-none shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (confirm("Are you sure you want to quit this exam session? Your progress will not be saved.")) {
                  router.push("/");
                }
              }}
              className="px-2.5 py-1 bg-red-800/80 hover:bg-red-700 text-white font-bold rounded text-xs transition"
            >
              Quit Test
            </button>
            <span className="font-bold tracking-wide uppercase text-blue-200">
              {section === "quant"
                ? "Quantitative Reasoning"
                : "Verbal Reasoning"}
            </span>
          </div>

          <div className="font-bold tracking-widest text-base">
            Question {currentIndex + 1} of {questions.length}
          </div>

          <div className="flex items-center gap-3">
            {/* Mark for review checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer bg-white/10 px-2.5 py-1 rounded border border-white/20 hover:bg-white/20 transition">
              <input
                type="checkbox"
                checked={isMarked}
                onChange={toggleMark}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-xs font-bold uppercase">Mark</span>
            </label>

            {/* Review Screen Button */}
            <button
              onClick={() => setIsReviewOpen(true)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded border border-white/20 text-xs font-bold uppercase transition"
            >
              Review
            </button>

            {/* Calculator Button (Quant only) */}
            {section === "quant" && (
              <button
                onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
                className={`px-3 py-1 rounded border text-xs font-bold uppercase transition ${
                  isCalculatorOpen
                    ? "bg-amber-400 text-black border-amber-500"
                    : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                }`}
              >
                Calculator
              </button>
            )}

            {/* Timer & Hide Time Button */}
            <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded border border-white/10">
              {!isTimerHidden && (
                <span
                  className={`font-mono font-bold tracking-wider ${
                    isTimeLow ? "text-amber-300 animate-pulse" : "text-white"
                  }`}
                >
                  {String(minutesLeft).padStart(2, "0")}:
                  {String(secondsLeft).padStart(2, "0")}
                </span>
              )}
              <button
                onClick={() => setIsTimerHidden(!isTimerHidden)}
                className="text-[11px] underline text-gray-300 hover:text-white"
              >
                {isTimerHidden ? "Show Time" : "Hide Time"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Exam Question Canvas */}
      <main className="max-w-5xl w-full mx-auto p-6 md:p-8 flex-1">
        <div className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-sm min-h-[480px] flex flex-col justify-between">
          <ExamQuestionRenderer
            question={currentQ}
            currentAnswer={userAnswers[currentQ.id]}
            onAnswerChange={handleAnswerChange}
            calculatorTransferVal={calcTransferVal}
          />
        </div>
      </main>

      {/* Floating GRE Calculator */}
      <GRECalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onTransferDisplay={handleCalculatorTransfer}
      />

      {/* Question Review Grid Modal */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        questions={questions}
        userAnswers={userAnswers}
        markedQuestions={markedQuestions}
        onSelectQuestion={(idx) => setCurrentIndex(idx)}
        currentIndex={currentIndex}
      />

      {/* Section Submission Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-gray-400 max-w-md w-full p-6 text-center space-y-4">
            <h3 className="text-xl font-bold text-gray-900">
              Submit This Section?
            </h3>
            {unansweredCount > 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                ⚠️ You have <strong>{unansweredCount} incomplete or unanswered</strong> question{unansweredCount > 1 ? "s" : ""}. Unanswered questions receive 0 points on the GRE.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                You have answered all {questions.length} questions in this section.
              </p>
            )}
            <p className="text-xs text-gray-500">
              Once you submit, you cannot return to this section.
            </p>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
              >
                Return to Test
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  setIsFinished(true);
                }}
                className="px-5 py-2 bg-[#1b3a5b] hover:bg-[#12273e] text-white text-sm font-bold rounded-lg shadow transition"
              >
                Submit Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Toolbar */}
      <footer className="bg-white border-t border-gray-300 py-3 px-6 shadow-inner select-none">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={currentIndex === 0}
            className={`px-6 py-2 rounded-lg text-sm font-bold border transition ${
              currentIndex === 0
                ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200"
                : "bg-white hover:bg-gray-100 text-gray-800 border-gray-400 shadow-sm"
            }`}
          >
            &larr; Back
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold border border-gray-300 rounded-lg transition"
            >
              End Section
            </button>

            <button
              onClick={handleNext}
              className="px-7 py-2 bg-[#1b3a5b] hover:bg-[#12273e] text-white text-sm font-bold rounded-lg shadow transition"
            >
              {currentIndex === questions.length - 1 ? "Review & Finish" : "Next \u2192"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
