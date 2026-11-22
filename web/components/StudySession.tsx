"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { selectNextQuestion } from "gre-adaptive-engine";
import type { AnyQuestion, Section } from "gre-adaptive-engine";
import { ALL_QUESTIONS, BANK } from "@/lib/questionBank";
import { useAdaptiveState } from "@/lib/useAdaptiveState";
import QuestionRenderer from "@/components/questions/QuestionRenderer";

function formatTopic(topic: string) {
  const words = topic.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
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
  const [questionNumber, setQuestionNumber] = useState(0);

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

  const practiceBank = useMemo(() => beginner ? BANK.filter((item) => item.section === "quant" && item.difficulty === 1) : BANK, [beginner]);
  const topics = useMemo(() => [...new Set(practiceBank.filter((item) => !section || item.section === section)
    .map((item) => item.topic))].sort(), [practiceBank, section]);

  const pickNext = useCallback((selectedTopic: string) => {
    const pool = mistakesOnly ? mistakeBank : practiceBank;
    if (pool.length === 0) {
      setQuestion(null);
      setAnswered(false);
      return;
    }
    setQuestion(selectNextQuestion(state, pool, { section, topics: selectedTopic ? [selectedTopic] : undefined }));
    setQuestionNumber((number) => number + 1);
    setAnswered(false);
  }, [state, section, mistakesOnly, mistakeBank, practiceBank]);

  useEffect(() => {
    if (hydrated && !question) pickNext(initialTopic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

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
        <div className="practice-topic">
          <label htmlFor="practice-topic">Topic</label>
          <select id="practice-topic" className="field-select" value={topic} onChange={(event) => {
            const value = event.target.value;
            setTopic(value);
            pickNext(value);
          }}>
            <option value="">All topics</option>
            {topics.map((name) => <option key={name} value={name}>{formatTopic(name)}</option>)}
          </select>
        </div>
      )}

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
        <button className="button next-button" onClick={() => pickNext(topic)}>
          Next question
        </button>
      )}
    </main>
  );
}
