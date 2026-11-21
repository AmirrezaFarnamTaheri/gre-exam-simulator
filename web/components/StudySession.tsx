"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { selectNextQuestion } from "gre-adaptive-engine";
import type { AnyQuestion, Section } from "gre-adaptive-engine";
import { BANK } from "@/lib/questionBank";
import { useAdaptiveState } from "@/lib/useAdaptiveState";
import QuestionRenderer from "@/components/questions/QuestionRenderer";

export default function StudySession({
  section,
  mistakesOnly = false,
}: {
  section: Section | undefined;
  mistakesOnly?: boolean;
}) {
  const { state, recordAnswer, hydrated } = useAdaptiveState();
  const [question, setQuestion] = useState<AnyQuestion | null>(null);
  const [answered, setAnswered] = useState(false);

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
    return BANK.filter((q) => missedIds.has(q.id));
  }, [mistakesOnly, state.attempts]);

  const pickNext = useCallback(() => {
    const pool = mistakesOnly ? mistakeBank : BANK;
    if (pool.length === 0) {
      setQuestion(null);
      setAnswered(false);
      return;
    }
    setQuestion(selectNextQuestion(state, pool, { section }));
    setAnswered(false);
  }, [state, section, mistakesOnly, mistakeBank]);

  useEffect(() => {
    if (hydrated && !question) pickNext();
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
    ? `Mistake Notebook (${mistakeBank.length} unresolved)`
    : section
    ? `${section[0].toUpperCase()}${section.slice(1)} practice`
    : "Mixed practice";

  return (
    <main className="container">
      <div className="session-header">
        <Link href="/">&larr; Dashboard</Link>
        <h1>{heading}</h1>
      </div>

      {question ? (
        <QuestionRenderer key={question.id} question={question} onAnswered={handleAnswered} />
      ) : (
        <p>
          {mistakesOnly
            ? "No unresolved mistakes! Every question you have attempted is currently mastered."
            : "No questions available for this selection yet."}
        </p>
      )}

      {answered && (
        <button className="button next-button" onClick={pickNext}>
          Next Question
        </button>
      )}
    </main>
  );
}
