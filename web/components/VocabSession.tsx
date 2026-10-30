"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isDue, reviewCard, type SrsGrade } from "gre-adaptive-engine";
import { VOCAB, cardFor, loadVocabProgress, saveVocabProgress, type VocabProgress } from "@/lib/vocab";

const NEW_PER_SESSION = 15;

export default function VocabSession() {
  const [progress, setProgress] = useState<VocabProgress>({});
  const [hydrated, setHydrated] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  useEffect(() => {
    const saved = loadVocabProgress();
    const now = Date.now();
    const due = VOCAB.filter((w) => saved[w.id] && isDue(saved[w.id], now)).map((w) => w.id);
    const fresh = VOCAB.filter((w) => !saved[w.id]).slice(0, NEW_PER_SESSION).map((w) => w.id);
    setProgress(saved);
    setQueue([...due, ...fresh]);
    setHydrated(true);
  }, []);

  const byId = useMemo(() => new Map(VOCAB.map((w) => [w.id, w])), []);
  const learned = Object.keys(progress).length;
  const current = queue.length ? byId.get(queue[0]) : undefined;

  function grade(g: SrsGrade) {
    if (!current) return;
    const now = Date.now();
    const next = reviewCard(cardFor(progress, current.id, now), g, now);
    const updated = { ...progress, [current.id]: next };
    setProgress(updated);
    saveVocabProgress(updated);
    setReviewed((n) => n + 1);
    setRevealed(false);
    // A lapsed card goes to the back of this session's queue so it is seen again.
    setQueue((q) => (g === 1 ? [...q.slice(1), q[0]] : q.slice(1)));
  }

  if (!hydrated) {
    return (
      <main className="container">
        <p>Loading your vocabulary progress...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <p>
        <Link href="/">&larr; Dashboard</Link>
      </p>
      <h1>GRE Vocabulary &middot; Spaced Repetition</h1>
      <p style={{ color: "var(--muted)" }}>
        {learned} of {VOCAB.length} words started &middot; {queue.length} left this session &middot; {reviewed} reviewed
      </p>

      {current ? (
        <section style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "1.5rem", margin: "1rem 0" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{current.list}</div>
          <h2 style={{ fontSize: "2rem", margin: "0.25rem 0 1rem" }}>{current.word}</h2>
          {revealed ? (
            <>
              <p style={{ fontSize: "1.1rem" }}>{current.definition}</p>
              {current.pos && (
                <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  <em>{current.pos}</em>
                </p>
              )}
              {current.example && <p style={{ color: "var(--muted)", fontStyle: "italic" }}>&ldquo;{current.example}&rdquo;</p>}
              {current.synonyms && (
                <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                  <strong>Synonyms:</strong> {current.synonyms}
                </p>
              )}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
                <button className="button" onClick={() => grade(1)}>Again</button>
                <button className="button" onClick={() => grade(3)}>Hard</button>
                <button className="button" onClick={() => grade(4)}>Good</button>
                <button className="button" onClick={() => grade(5)}>Easy</button>
              </div>
            </>
          ) : (
            <button className="button" onClick={() => setRevealed(true)}>
              Show definition
            </button>
          )}
        </section>
      ) : (
        <section style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "1.5rem", margin: "1rem 0" }}>
          <h2>Session complete</h2>
          <p>
            No more cards are due right now. Reload this page for {NEW_PER_SESSION} more new words, or come back tomorrow for
            reviews.
          </p>
        </section>
      )}
    </main>
  );
}
