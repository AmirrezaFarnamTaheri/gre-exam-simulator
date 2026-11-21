"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isDue, reviewCard, type SrsGrade } from "gre-adaptive-engine";
import {
  SYNONYM_CLUSTERS,
  VOCAB,
  cardFor,
  loadVocabProgress,
  saveVocabProgress,
  type SynonymCluster,
  type VocabProgress,
} from "@/lib/vocab";

const NEW_PER_SESSION = 20;

interface PairRound {
  cluster: SynonymCluster;
  options: string[];
  correctPair: [string, string];
}

function buildPairRound(clusters: SynonymCluster[]): PairRound {
  const valid = clusters.filter((c) => c.words.length >= 2);
  const picked = valid[Math.floor(Math.random() * valid.length)];
  const shuffledCluster = [...picked.words].sort(() => Math.random() - 0.5);
  const correctPair: [string, string] = [shuffledCluster[0], shuffledCluster[1]];

  const distractors: string[] = [];
  let guard = 0;
  while (distractors.length < 4 && guard < 200) {
    guard++;
    const other = valid[Math.floor(Math.random() * valid.length)];
    if (other.id === picked.id) continue;
    const cand = other.words[Math.floor(Math.random() * other.words.length)];
    if (!picked.words.includes(cand) && !distractors.includes(cand)) {
      distractors.push(cand);
    }
  }

  const options = [...correctPair, ...distractors].sort(() => Math.random() - 0.5);
  return { cluster: picked, options, correctPair };
}

export default function VocabSession() {
  const [mode, setMode] = useState<"srs" | "synonyms">("srs");
  const [deckFilter, setDeckFilter] = useState<string>("GregMat 960");
  const [progress, setProgress] = useState<VocabProgress>({});
  const [hydrated, setHydrated] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const [pairRound, setPairRound] = useState<PairRound | null>(null);
  const [pairSelected, setPairSelected] = useState<string[]>([]);
  const [pairSubmitted, setPairSubmitted] = useState(false);
  const [pairStats, setPairStats] = useState({ correct: 0, total: 0 });

  const deckOptions = useMemo(() => {
    const gmGroups = Array.from({ length: 32 }, (_, i) => `GregMat Group ${String(i + 1).padStart(2, "0")}`);
    return [
      "All Words",
      "GregMat 960",
      "Hard (Difficulty 4-5)",
      "GRE High-Frequency",
      ...gmGroups,
    ];
  }, []);

  const filteredVocab = useMemo(() => {
    if (deckFilter === "All Words") return VOCAB;
    if (deckFilter === "Hard (Difficulty 4-5)") {
      return VOCAB.filter((w) => w.difficulty >= 4);
    }
    return VOCAB.filter(
      (w) => w.list === deckFilter || (w.groups && w.groups.includes(deckFilter))
    );
  }, [deckFilter]);

  useEffect(() => {
    const saved = loadVocabProgress();
    const now = Date.now();
    const due = filteredVocab.filter((w) => saved[w.id] && isDue(saved[w.id], now)).map((w) => w.id);
    const fresh = filteredVocab.filter((w) => !saved[w.id]).slice(0, NEW_PER_SESSION).map((w) => w.id);
    setProgress(saved);
    setQueue([...due, ...fresh]);
    setRevealed(false);
    setHydrated(true);
  }, [filteredVocab]);

  useEffect(() => {
    if (mode === "synonyms" && !pairRound && SYNONYM_CLUSTERS.length > 0) {
      setPairRound(buildPairRound(SYNONYM_CLUSTERS));
    }
  }, [mode, pairRound]);

  const byId = useMemo(() => new Map(VOCAB.map((w) => [w.id, w])), []);
  const learnedInDeck = filteredVocab.filter((w) => progress[w.id]).length;
  const deckPct = filteredVocab.length ? Math.round((learnedInDeck / filteredVocab.length) * 100) : 0;
  const current = queue.length ? byId.get(queue[0]) : undefined;

  const grade = useCallback(
    (g: SrsGrade) => {
      if (!current) return;
      const now = Date.now();
      const next = reviewCard(cardFor(progress, current.id, now), g, now);
      const updated = { ...progress, [current.id]: next };
      setProgress(updated);
      saveVocabProgress(updated);
      setReviewed((n) => n + 1);
      setRevealed(false);
      setQueue((q) => (g === 1 ? [...q.slice(1), q[0]] : q.slice(1)));
    },
    [current, progress]
  );

  useEffect(() => {
    if (mode !== "srs" || !current) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!revealed) setRevealed(true);
      } else if (revealed) {
        if (e.key === "1") grade(1);
        else if (e.key === "2") grade(3);
        else if (e.key === "3") grade(4);
        else if (e.key === "4") grade(5);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, current, revealed, grade]);

  function togglePairChoice(word: string) {
    if (pairSubmitted) return;
    setPairSelected((prev) => {
      if (prev.includes(word)) return prev.filter((w) => w !== word);
      if (prev.length < 2) return [...prev, word];
      return [prev[1], word];
    });
  }

  function submitPair() {
    if (!pairRound || pairSelected.length !== 2 || pairSubmitted) return;
    const ok = pairRound.correctPair.every((w) => pairSelected.includes(w));
    setPairSubmitted(true);
    setPairStats((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
  }

  function nextPairRound() {
    setPairRound(buildPairRound(SYNONYM_CLUSTERS));
    setPairSelected([]);
    setPairSubmitted(false);
  }

  if (!hydrated) {
    return (
      <main className="container-narrow">
        <p className="muted-text">Loading vocabulary decks and spaced-repetition schedule...</p>
      </main>
    );
  }

  return (
    <main className="container-narrow">
      <div className="dash-header" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Vocabulary</h1>
        <div className="tab-row" role="tablist" aria-label="Vocabulary modes" style={{ margin: 0 }}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "srs"}
            className={`tab-btn ${mode === "srs" ? "active" : ""}`}
            onClick={() => setMode("srs")}
          >
            Flashcards
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "synonyms"}
            className={`tab-btn ${mode === "synonyms" ? "active" : ""}`}
            onClick={() => setMode("synonyms")}
          >
            Synonym Pairs
          </button>
        </div>
      </div>

      {mode === "srs" ? (
        <>
          <div className="surface-card">
            <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", alignItems: "end" }}>
              <label htmlFor="gre-deck-select" className="field-label">
                Word List
                <select
                  id="gre-deck-select"
                  className="field-select"
                  value={deckFilter}
                  onChange={(e) => setDeckFilter(e.target.value)}
                >
                  {deckOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
              <div>
                <div className="muted-text" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem" }}>
                  <span>Learned: {learnedInDeck} / {filteredVocab.length} ({deckPct}%)</span>
                  <span>Left: {queue.length} | Done today: {reviewed}</span>
                </div>
                <div className="word-progress-track">
                  <div className="word-progress-fill" style={{ width: `${deckPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {current ? (
            <section className="surface-card">
              <div className="muted-text" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "0.5rem" }}>
                <span>
                  {current.gregmatGroup ? `GregMat Group ${current.gregmatGroup} | ` : ""}
                  {current.list}
                </span>
                <span>Difficulty {current.difficulty} / 5</span>
              </div>
              <h2 className="font-serif" style={{ fontSize: "clamp(1.75rem, 4vw, 2.3rem)", margin: "0.25rem 0 1.25rem" }}>
                {current.word}
              </h2>

              {revealed ? (
                <div>
                  <p style={{ fontSize: "1.1rem", margin: "0 0 0.5rem" }}>{current.definition}</p>
                  {current.pos && <p className="muted-text" style={{ margin: "0 0 0.5rem" }}><em>{current.pos}</em></p>}
                  {current.example && (
                    <p className="passage-text" style={{ margin: "0.75rem 0" }}>&ldquo;{current.example}&rdquo;</p>
                  )}
                  {current.synonyms && (
                    <p className="muted-text" style={{ margin: "0.35rem 0" }}>
                      <strong>Synonyms:</strong> {current.synonyms}
                    </p>
                  )}
                  {current.antonyms && (
                    <p className="muted-text" style={{ margin: "0.35rem 0" }}>
                      <strong>Antonyms:</strong> {current.antonyms}
                    </p>
                  )}
                  <div className="tab-row" style={{ marginBottom: "0.5rem" }}>
                    <button type="button" className="btn-ghost" onClick={() => grade(1)}>1. Again</button>
                    <button type="button" className="btn-ghost" onClick={() => grade(3)}>2. Hard</button>
                    <button type="button" className="button" onClick={() => grade(4)}>3. Good</button>
                    <button type="button" className="btn-accent" onClick={() => grade(5)}>4. Easy</button>
                  </div>
                  <p className="muted-text" style={{ fontSize: "0.8rem", margin: 0 }}>
                    Keyboard shortcuts: Space to reveal, keys 1 to 4 to grade.
                  </p>
                </div>
              ) : (
                <button type="button" className="button" onClick={() => setRevealed(true)}>
                  Reveal Definition (Space)
                </button>
              )}
            </section>
          ) : (
            <section className="surface-card">
              <h2>Session Complete</h2>
              <p className="muted-text">
                All due cards in <strong>{deckFilter}</strong> are finished. Choose another GregMat group above or reload to pull {NEW_PER_SESSION} fresh words.
              </p>
            </section>
          )}
        </>
      ) : pairRound ? (
        <section className="surface-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <h2 style={{ margin: 0 }}>Match the Two Synonyms</h2>
            <span className="muted-text font-mono">
              Score: {pairStats.correct} / {pairStats.total}
            </span>
          </div>
          <p className="muted-text" style={{ marginTop: 0 }}>
            Pick the two words with the closest meaning.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.65rem", margin: "1rem 0" }}>
            {pairRound.options.map((opt) => {
              const picked = pairSelected.includes(opt);
              const isRight = pairSubmitted && pairRound.correctPair.includes(opt);
              const isWrong = pairSubmitted && picked && !pairRound.correctPair.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => togglePairChoice(opt)}
                  aria-pressed={picked}
                  className={`choice ${picked ? "selected" : ""} ${isRight ? "correct" : ""} ${isWrong ? "incorrect" : ""}`}
                  style={{ justifyContent: "center" }}
                >
                  <span>{opt}</span>
                  {isRight && <span aria-label="Correct"> (Match)</span>}
                  {isWrong && <span aria-label="Incorrect"> (No)</span>}
                </button>
              );
            })}
          </div>

          {!pairSubmitted ? (
            <button type="button" className="button" disabled={pairSelected.length !== 2} onClick={submitPair}>
              Check Pair ({pairSelected.length} / 2 selected)
            </button>
          ) : (
            <div className={`feedback ${pairRound.correctPair.every((w) => pairSelected.includes(w)) ? "correct" : "incorrect"}`}>
              <p style={{ margin: "0 0 0.4rem" }}>
                <strong>
                  {pairRound.correctPair.every((w) => pairSelected.includes(w)) ? "Correct pair:" : "Expected pair:"}
                </strong>{" "}
                {pairRound.correctPair.join(" and ")}
              </p>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.9rem" }}>
                <strong>Full cluster:</strong> {pairRound.cluster.words.join(", ")}
              </p>
              {pairRound.cluster.meaning_fa && (
                <p style={{ margin: "0 0 0.85rem", fontSize: "0.92rem", direction: "rtl" }}>
                  <strong>معنی:</strong> {pairRound.cluster.meaning_fa}
                </p>
              )}
              <button type="button" className="button" onClick={nextPairRound}>
                Next Synonym Pair
              </button>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
