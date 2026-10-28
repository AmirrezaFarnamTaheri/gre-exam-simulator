"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { selectNextQuestion } from "gre-adaptive-engine";
import type { AnyQuestion, Section } from "gre-adaptive-engine";
import { BANK } from "@/lib/questionBank";
import { useAdaptiveState } from "@/lib/useAdaptiveState";
import QuestionRenderer from "@/components/questions/QuestionRenderer";

export default function StudySession({ section }: { section: Section | undefined }) {
  const { state, recordAnswer, hydrated } = useAdaptiveState();
  const [question, setQuestion] = useState<AnyQuestion | null>(null);
  const [answered, setAnswered] = useState(false);

  const pickNext = useCallback(() => {
    setQuestion(selectNextQuestion(state, BANK, { section }));
    setAnswered(false);
  }, [state, section]);

  useEffect(() => {
    if (hydrated && !question) pickNext();
    // Only re-run when hydration completes (initial pick) -- not on every state/pickNext change.
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

  const heading = section ? `${section[0].toUpperCase()}${section.slice(1)} practice` : "Mixed practice";

  return (
    <main className="container">
      <div className="session-header">
        <Link href="/">&larr; Dashboard</Link>
        <h1>{heading}</h1>
      </div>

      {question ? (
        <QuestionRenderer key={question.id} question={question} onAnswered={handleAnswered} />
      ) : (
        <p>No questions available for this selection yet.</p>
      )}

      {answered && (
        <button className="button next-button" onClick={pickNext}>
          Next Question
        </button>
      )}
    </main>
  );
}
