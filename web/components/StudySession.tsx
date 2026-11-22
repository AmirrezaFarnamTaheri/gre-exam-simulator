"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { selectNextQuestion } from "gre-adaptive-engine";
import type { AnyQuestion, Section } from "gre-adaptive-engine";
import { ALL_QUESTIONS, BANK } from "@/lib/questionBank";
import { getQuestionExamTarget, QTYPE_FILTER_LABELS, type QuestionType } from "@/lib/examTargets";
import { useAdaptiveState } from "@/lib/useAdaptiveState";
import QuestionRenderer from "@/components/questions/QuestionRenderer";

function formatTopic(topic: string) {
  const words = topic.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function fmtElapsed(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export default function StudySession({
  section,
  mistakesOnly = false,
  initialTopic = "",
  beginner = false,
}: {
  section: Section | undefined;
  mistakesOnly?: boolean;
  initialTopic?: string;
  beginner?: boolean;
}) {
  const { state, recordAnswer, hydrated } = useAdaptiveState();
  const [question, setQuestion] = useState<AnyQuestion | null>(null);
  const [answered, setAnswered] = useState(false);
  const [topic, setTopic] = useState(initialTopic);
  const [qtypeFilter, setQtypeFilter] = useState<QuestionType | "">("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [showPacing, setShowPacing] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Unresolved mistakes: questions whose MOST RECENT attempt was incorrect
  const mistakeBank = useMemo(() => {
    if (!mistakesOnly) return BANK;
    const latestByQ = new Map<string, boolean>();
    for (const a of state.attempts) {
      latestByQ.set(a.questionId, a.correct);
    }
    const missedIds = new Set(
      [...latestByQ.entries()].filter(([, ok]) => !ok).map(([id]) => id)
    );
    return ALL_QUESTIONS.filter((q) => missedIds.has(q.id));
  }, [mistakesOnly, state.attempts]);

  const practiceBank = useMemo(
    () => (beginner ? BANK.filter((item) => item.section === "quant" && item.difficulty === 1) : BANK),
    [beginner]
  );

  const availableQtypes = useMemo(
    () =>
      [...new Set(practiceBank.filter((item) => !section || item.section === section).map((item) => item.qtype))] as QuestionType[],
    [practiceBank, section]
  );

  const topics = useMemo(
    () =>
      [
        ...new Set(
          practiceBank
            .filter((item) => (!section || item.section === section) && (!qtypeFilter || item.qtype === qtypeFilter))
            .map((item) => item.topic)
        ),
      ].sort(),
    [practiceBank, section, qtypeFilter]
  );

  const pickNext = useCallback(
    (selectedTopic: string, selectedQtype: QuestionType | "" = qtypeFilter) => {
      const basePool = mistakesOnly ? mistakeBank : practiceBank;
      const pool = selectedQtype ? basePool.filter((q) => q.qtype === selectedQtype) : basePool;
      if (pool.length === 0) {
        setQuestion(null);
        setAnswered(false);
        return;
      }
      setQuestion(selectNextQuestion(state, pool, { section, topics: selectedTopic ? [selectedTopic] : undefined }));
      setQuestionNumber((number) => number + 1);
      setAnswered(false);
      setElapsedSec(0);
    },
    [state, section, mistakesOnly, mistakeBank, practiceBank, qtypeFilter]
  );

  useEffect(() => {
    if (hydrated && !question) pickNext(initialTopic, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!question || answered) return;
    const id = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [question, answered, questionNumber]);

  function handleAnswered(correct: boolean) {
    if (!question) return;
    recordAnswer(question, correct);
    setAnswered(true);
  }

  if (!hydrated) {
    return (
      <main className="container">
        <p>Loading...</p>
      </main>
    );
  }

  const heading = mistakesOnly
    ? "Retry missed questions"
    : beginner
    ? "Math foundations"
    : section
    ? section === "quant" ? "Math practice" : "Verbal practice"
    : "Mixed practice";

  return (
    <main className="container">
      <div className="session-header">
        <Link href={mistakesOnly ? "/progress" : "/practice"}>&larr; {mistakesOnly ? "Progress" : "Practice"}</Link>
        <h1>{heading}</h1>
      </div>

      {!mistakesOnly && (
        <div className="practice-controls">
          {availableQtypes.length > 1 && (
            <div className="practice-topic">
              <label htmlFor="practice-format">Exam task</label>
              <select
                id="practice-format"
                className="field-select"
                value={qtypeFilter}
                onChange={(event) => {
                  const nextFormat = event.target.value as QuestionType | "";
                  setQtypeFilter(nextFormat);
                  setTopic("");
                  pickNext("", nextFormat);
                }}
              >
                <option value="">All exam tasks</option>
                {availableQtypes.map((qt) => (
                  <option key={qt} value={qt}>{QTYPE_FILTER_LABELS[qt]}</option>
                ))}
              </select>
            </div>
          )}
          <div className="practice-topic">
            <label htmlFor="practice-topic">Topic</label>
            <select id="practice-topic" className="field-select" value={topic} onChange={(event) => {
              const value = event.target.value;
              setTopic(value);
              pickNext(value, qtypeFilter);
            }}>
              <option value="">All topics</option>
              {topics.map((name) => <option key={name} value={name}>{formatTopic(name)}</option>)}
            </select>
          </div>
          <button
            type="button"
            className="btn-ghost pacing-toggle"
            onClick={() => setShowPacing((v) => !v)}
          >
            {showPacing ? "Hide pace timer" : "Show pace timer"}
          </button>
        </div>
      )}

      {question && (() => {
        const target = getQuestionExamTarget(question);
        const overPace = elapsedSec > target.pacingSeconds;
        return (
          <div className="exam-target-bar" aria-label="Exam task target">
            <div>
              <span className="exam-target-tag">Exam target: {target.section} - {target.task}</span>
              <p className="exam-target-detail">{target.detail}</p>
            </div>
            {showPacing && (
              <span className={`pacing-pill font-mono ${overPace ? "over" : ""}`}>
                {fmtElapsed(elapsedSec)} / {target.pacingLabel}
              </span>
            )}
          </div>
        );
      })()}

      {question ? (
        <QuestionRenderer key={questionNumber} question={question} onAnswered={handleAnswered} />
      ) : (
        <p>
          {mistakesOnly
            ? "No missed questions to retry yet."
            : "No questions available for this selection yet."}
        </p>
      )}

      {answered && (
        <button className="button next-button" onClick={() => pickNext(topic, qtypeFilter)}>
          Next question
        </button>
      )}
    </main>
  );
}
