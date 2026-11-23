"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  determineSection2Difficulty,
  type AdaptiveDifficultyBand,
  type AnyQuestion,
  type Section,
} from "gre-adaptive-engine";
import { sampleTimedSection } from "@/lib/questionBank";
import GRECalculator from "./GRECalculator";
import ReviewModal from "./ReviewModal";
import ExamQuestionRenderer from "./ExamQuestionRenderer";
import ExamResults, { evaluateQuestionAnswer } from "./ExamResults";
import { postGreResult } from "@/lib/resultsSync";

interface ExamSessionProps {
  section: Section;
  adaptiveTwoStage?: boolean;
  questionCount?: number;
  durationMinutes?: number;
}

export default function ExamSession({
  section,
  adaptiveTwoStage = true,
  questionCount = 12,
  durationMinutes = 21,
}: ExamSessionProps) {
  const router = useRouter();

  // Stage state: 1 (12 Q Medium) -> transition -> 2 (15 Q Easy/Medium/Hard)
  const [stage, setStage] = useState<1 | 2>(1);
  const [stageTransition, setStageTransition] = useState<{
    s1Correct: number;
    s1Total: number;
    nextBand: AdaptiveDifficultyBand;
  } | null>(null);
  const [s2Difficulty, setS2Difficulty] = useState<AdaptiveDifficultyBand>("medium");

  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [s1Questions, setS1Questions] = useState<AnyQuestion[]>([]);
  const [s1Answers, setS1Answers] = useState<Record<string, any>>({});
  const [s1TimeSec, setS1TimeSec] = useState(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Record<string, boolean>>({});
  const [questionTimesSec, setQuestionTimesSec] = useState<Record<string, number>>({});

  // Tool states
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calcTransferVal, setCalcTransferVal] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Stage-specific durations (official Shortened GRE timings)
  const stageDurationMin =
    stage === 1
      ? durationMinutes
      : section === "quant"
      ? 26
      : 23;
  const totalSeconds = stageDurationMin * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [isTimerHidden, setIsTimerHidden] = useState(false);

  const currentQIdRef = useRef<string | null>(null);

  function startFreshExam() {
    const s1 = sampleTimedSection(section, questionCount, "medium", new Set());
    setStage(1);
    setStageTransition(null);
    setS2Difficulty("medium");
    setQuestions(s1);
    setS1Questions([]);
    setS1Answers({});
    setS1TimeSec(0);
    setUserAnswers({});
    setMarkedQuestions({});
    setQuestionTimesSec({});
    setCurrentIndex(0);
    setIsFinished(false);
    setSecondsRemaining(durationMinutes * 60);
  }

  useEffect(() => {
    startFreshExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, questionCount, durationMinutes, adaptiveTwoStage]);

  const currentQ = questions[currentIndex];
  useEffect(() => {
    currentQIdRef.current = currentQ?.id ?? null;
  }, [currentQ?.id]);

  // Close submit confirmation modal on Escape key
  useEffect(() => {
    if (!showSubmitConfirm) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowSubmitConfirm(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSubmitConfirm]);

  // Countdown + per-question elapsed time tracker
  useEffect(() => {
    if (isFinished || stageTransition || questions.length === 0) return;

    const timer = setInterval(() => {
      const activeId = currentQIdRef.current;
      if (activeId) {
        setQuestionTimesSec((prev) => ({ ...prev, [activeId]: (prev[activeId] ?? 0) + 1 }));
      }
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishCurrentStage();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, stageTransition, questions.length, stage]);

  function finishCurrentStage() {
    setShowSubmitConfirm(false);
    if (adaptiveTwoStage && stage === 1) {
      const s1Correct = questions.filter((q) => evaluateQuestionAnswer(q, userAnswers[q.id])).length;
      const nextBand = determineSection2Difficulty(s1Correct, questions.length);
      setS1Questions(questions);
      setS1Answers(userAnswers);
      setS1TimeSec(totalSeconds - secondsRemaining);
      setS2Difficulty(nextBand);
      setStageTransition({ s1Correct, s1Total: questions.length, nextBand });
    } else {
      const combinedQs = adaptiveTwoStage ? [...s1Questions, ...questions] : questions;
      const combinedAns = adaptiveTwoStage ? { ...s1Answers, ...userAnswers } : userAnswers;
      const totalOk = combinedQs.filter((q) => evaluateQuestionAnswer(q, combinedAns[q.id])).length;
      postGreResult({
        kind: "run",
        id: `gre-sec-${section}-${Date.now()}`,
        runType: "section_test",
        title: `GRE Timed ${section === "quant" ? "Math" : "Verbal"} (${combinedQs.length} Q)`,
        scores: {
          section,
          correct: totalOk,
          total: combinedQs.length,
          adaptiveTwoStage,
          s2Difficulty: adaptiveTwoStage ? s2Difficulty : null,
        },
        details: {
          items: combinedQs.map((q) => ({
            id: q.id,
            section: q.section,
            qtype: q.qtype,
            topic: q.topic,
            correct: evaluateQuestionAnswer(q, combinedAns[q.id]),
            elapsedSec: questionTimesSec[q.id] || 0,
          })),
        },
      });
      setIsFinished(true);
    }
  }

  function beginStage2() {
    if (!stageTransition) return;
    const seen = new Set(s1Questions.map((q) => q.id));
    const s2 = sampleTimedSection(section, 15, stageTransition.nextBand, seen);
    setStage(2);
    setQuestions(s2);
    setUserAnswers({});
    setMarkedQuestions({});
    setCurrentIndex(0);
    setStageTransition(null);
    setSecondsRemaining((section === "quant" ? 26 : 23) * 60);
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans bg-gray-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-md border">
          <h2 className="text-lg font-bold text-gray-800">Starting Test...</h2>
          <p className="text-sm text-gray-500 mt-2">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (stageTransition) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-6 font-sans">
        <div className="bg-white border-2 border-[#1b3a5b] rounded-xl max-w-lg w-full p-8 shadow-lg space-y-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Part 1 Complete
          </p>
          <h2 className="text-2xl font-bold text-gray-900">
            Ready for Part 2 ({section === "quant" ? "15 Q · 26 Min" : "15 Q · 23 Min"})
          </h2>
          <p className="text-sm text-gray-600">
            You answered {stageTransition.s1Correct} of {stageTransition.s1Total} correctly in Part 1.
            Your Part 2 difficulty is{" "}
            <strong className="uppercase text-[#1b3a5b]">{stageTransition.nextBand}</strong>.
          </p>
          <button
            type="button"
            onClick={beginStage2}
            className="w-full py-3 bg-[#1b3a5b] hover:bg-[#12273e] text-white font-bold rounded-lg shadow transition"
          >
            Start Part 2 &rarr;
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const allQuestions = adaptiveTwoStage ? [...s1Questions, ...questions] : questions;
    const allAnswers = adaptiveTwoStage ? { ...s1Answers, ...userAnswers } : userAnswers;
    const totalTimeSpent = (adaptiveTwoStage ? s1TimeSec : 0) + (totalSeconds - secondsRemaining);
    const s1Correct = adaptiveTwoStage
      ? s1Questions.filter((q) => evaluateQuestionAnswer(q, s1Answers[q.id])).length
      : undefined;

    const title =
      section === "quant"
        ? adaptiveTwoStage
          ? "Quantitative Reasoning (Full 2-Stage Adaptive: 12 + 15 Q)"
          : "Section 1: Quantitative Reasoning"
        : adaptiveTwoStage
        ? "Verbal Reasoning (Full 2-Stage Adaptive: 12 + 15 Q)"
        : "Section 1: Verbal Reasoning";

    return (
      <ExamResults
        section={section}
        questions={allQuestions}
        userAnswers={allAnswers}
        timeSpentSec={totalTimeSpent}
        questionTimesSec={questionTimesSec}
        sectionTitle={title}
        s1Count={adaptiveTwoStage ? s1Questions.length : undefined}
        s1Correct={s1Correct}
        s2Difficulty={adaptiveTwoStage ? s2Difficulty : undefined}
        onRetake={() => {
          setIsFinished(false);
          setUserAnswers({});
          setMarkedQuestions({});
          setCurrentIndex(0);
          setSecondsRemaining(totalSeconds);
        }}
        onRetakeFresh={startFreshExam}
      />
    );
  }

  const isMarked = !!markedQuestions[currentQ.id];
  const minutesLeft = Math.floor(secondsRemaining / 60);
  const secondsLeft = secondsRemaining % 60;
  const isTimeLow = secondsRemaining < 300;

  function handleAnswerChange(ans: any) {
    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: ans }));
    setCalcTransferVal(null);
  }

  function toggleMark() {
    setMarkedQuestions((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowSubmitConfirm(true);
    }
  }

  function handleBack() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }

  const unansweredCount = questions.filter((q) => {
    const ans = userAnswers[q.id];
    if (ans === undefined || ans === null || ans === "") return true;
    if (q.qtype === "text_completion") {
      if (!ans || typeof ans !== "object") return true;
      return !Object.keys(q.choices).every((b) => !!ans[b]);
    }
    if (q.qtype === "sentence_equivalence") {
      return !Array.isArray(ans) || ans.length !== 2;
    }
    if (Array.isArray(ans)) return ans.length === 0;
    return false;
  }).length;

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900 font-sans flex flex-col justify-between">
      {/* ETS Top Header Toolbar */}
      <header className="bg-[#1b3a5b] text-white select-none shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
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
              {section === "quant" ? "Quantitative" : "Verbal"} · Section {stage}
              {adaptiveTwoStage && stage === 2 ? ` (${s2Difficulty})` : ""}
            </span>
          </div>

          <div className="font-bold tracking-widest text-base">
            Question {currentIndex + 1} of {questions.length}
          </div>

          <div className="test-tools flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer bg-white/10 px-2.5 py-1 rounded border border-white/20 hover:bg-white/20 transition">
              <input
                type="checkbox"
                checked={isMarked}
                onChange={toggleMark}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-xs font-bold uppercase">Mark</span>
            </label>

            <button
              onClick={() => setIsReviewOpen(true)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded border border-white/20 text-xs font-bold uppercase transition"
            >
              Review
            </button>

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

            <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded border border-white/10">
              {!isTimerHidden && (
                <span
                  className={`font-mono font-bold tracking-wider ${
                    isTimeLow ? "text-amber-300 animate-pulse" : "text-white"
                  }`}
                >
                  {String(minutesLeft).padStart(2, "0")}:{String(secondsLeft).padStart(2, "0")}
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

      <GRECalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onTransferDisplay={(val) => setCalcTransferVal(val)}
      />

      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        questions={questions}
        userAnswers={userAnswers}
        markedQuestions={markedQuestions}
        onSelectQuestion={(idx) => setCurrentIndex(idx)}
        currentIndex={currentIndex}
      />

      {showSubmitConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-confirm-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSubmitConfirm(false);
          }}
        >
          <div className="bg-white text-gray-900 rounded-xl shadow-2xl border-2 border-gray-400 max-w-md w-full p-6 text-center space-y-4">
            <h3 id="submit-confirm-title" className="text-xl font-bold text-gray-900">
              Submit Section {stage}?
            </h3>
            {unansweredCount > 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                Warning: You have <strong>{unansweredCount} incomplete or unanswered</strong> question
                {unansweredCount > 1 ? "s" : ""}. Unanswered questions receive 0 points on the GRE.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                You have answered all {questions.length} questions in Section {stage}.
              </p>
            )}
            <p className="text-xs text-gray-500">
              Once you submit, you cannot return to Section {stage}.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
              >
                Return to Test
              </button>
              <button
                type="button"
                onClick={finishCurrentStage}
                className="px-5 py-2 bg-[#1b3a5b] hover:bg-[#12273e] text-white text-sm font-bold rounded-lg shadow transition"
              >
                {adaptiveTwoStage && stage === 1 ? "Submit and continue" : "Finish test"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              End Section {stage}
            </button>

            <button
              onClick={handleNext}
              className="px-7 py-2 bg-[#1b3a5b] hover:bg-[#12273e] text-white text-sm font-bold rounded-lg shadow transition"
            >
              {currentIndex === questions.length - 1 ? "Review & Submit" : "Next \u2192"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
