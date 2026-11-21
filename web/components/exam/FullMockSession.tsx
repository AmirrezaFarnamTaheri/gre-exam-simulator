"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  calculateAdaptiveGreScore,
  determineSection2Difficulty,
  type AdaptiveDifficultyBand,
  type AnyQuestion,
  type Section,
} from "gre-adaptive-engine";
import { BANK } from "@/lib/questionBank";
import { useAdaptiveState } from "@/lib/useAdaptiveState";
import awaData from "../../../data/questions/awa.json";
import awaGuides from "../../../data/awa/guides.json";
import GRECalculator from "./GRECalculator";
import ReviewModal from "./ReviewModal";
import ExamQuestionRenderer from "./ExamQuestionRenderer";
import { evaluateQuestionAnswer } from "./ExamResults";

type MockPhase = "intro" | "awa" | "v1" | "q1" | "v2" | "q2" | "results";

interface AwaPrompt {
  id: string;
  type: "issue" | "argument";
  prompt: string;
  directions: string;
}

const ISSUE_PROMPTS = (awaData as AwaPrompt[]).filter((p) => p.type === "issue");

function shuffle<T>(arr: T[]): T[] {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

function sampleSection(
  section: Section,
  count: number,
  band: AdaptiveDifficultyBand,
  exclude: Set<string>
): AnyQuestion[] {
  const pool = BANK.filter((q) => q.section === section && !exclude.has(q.id));
  const diffs = band === "easy" ? [1, 2, 3] : band === "hard" ? [4, 5] : [3, 4, 2];
  const primary = shuffle(pool.filter((q) => diffs.includes(q.difficulty)));
  const fallback = shuffle(pool.filter((q) => !diffs.includes(q.difficulty)));
  const combined = [...primary, ...fallback];
  if (section === "quant") {
    const di = combined.filter((q) => q.qtype === "data_interpretation");
    const nonDi = combined.filter((q) => q.qtype !== "data_interpretation");
    const takeDi = Math.min(2, di.length);
    return shuffle([...nonDi.slice(0, Math.max(0, count - takeDi)), ...di.slice(0, takeDi)]).slice(0, count);
  }
  return combined.slice(0, count);
}

const PHASE_META: Record<Exclude<MockPhase, "intro" | "results">, { label: string; minutes: number; section?: Section }> = {
  awa: { label: "Section 1: Analytical Writing (Analyze an Issue)", minutes: 30 },
  v1: { label: "Section 2: Verbal Reasoning (Stage 1 · 12 Q)", minutes: 18, section: "verbal" },
  q1: { label: "Section 3: Quantitative Reasoning (Stage 1 · 12 Q)", minutes: 21, section: "quant" },
  v2: { label: "Section 4: Verbal Reasoning (Adaptive Stage 2 · 15 Q)", minutes: 23, section: "verbal" },
  q2: { label: "Section 5: Quantitative Reasoning (Adaptive Stage 2 · 15 Q)", minutes: 26, section: "quant" },
};

export default function FullMockSession() {
  const router = useRouter();
  const { recordAnswer, hydrated } = useAdaptiveState();

  const [phase, setPhase] = useState<MockPhase>("intro");
  const [awaPrompt, setAwaPrompt] = useState<AwaPrompt | null>(null);
  const [awaEssay, setAwaEssay] = useState("");
  const [copiedAwa, setCopiedAwa] = useState(false);

  const [v1Qs, setV1Qs] = useState<AnyQuestion[]>([]);
  const [q1Qs, setQ1Qs] = useState<AnyQuestion[]>([]);
  const [v2Qs, setV2Qs] = useState<AnyQuestion[]>([]);
  const [q2Qs, setQ2Qs] = useState<AnyQuestion[]>([]);

  const [v2Band, setV2Band] = useState<AdaptiveDifficultyBand>("medium");
  const [q2Band, setQ2Band] = useState<AdaptiveDifficultyBand>("medium");

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [qTimes, setQTimes] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(30 * 60);
  const [isTimerHidden, setIsTimerHidden] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcTransfer, setCalcTransfer] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [recordedResults, setRecordedResults] = useState(false);

  const activeQs =
    phase === "v1" ? v1Qs : phase === "q1" ? q1Qs : phase === "v2" ? v2Qs : phase === "q2" ? q2Qs : [];
  const currentQ = activeQs[currentIndex];
  const currentQIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentQIdRef.current = currentQ?.id ?? null;
  }, [currentQ?.id]);

  function startFullMock(skipAwa = false) {
    const pickedAwa = ISSUE_PROMPTS[Math.floor(Math.random() * ISSUE_PROMPTS.length)];
    const v1 = sampleSection("verbal", 12, "medium", new Set());
    const q1 = sampleSection("quant", 12, "medium", new Set());
    setAwaPrompt(pickedAwa);
    setAwaEssay("");
    setV1Qs(v1);
    setQ1Qs(q1);
    setV2Qs([]);
    setQ2Qs([]);
    setAnswers({});
    setMarked({});
    setQTimes({});
    setCurrentIndex(0);
    setRecordedResults(false);
    if (skipAwa) {
      setPhase("v1");
      setSecondsRemaining(18 * 60);
    } else {
      setPhase("awa");
      setSecondsRemaining(30 * 60);
    }
  }

  function advancePhase() {
    setIsCalcOpen(false);
    setIsReviewOpen(false);
    setCurrentIndex(0);
    setMarked({});
    if (phase === "awa") {
      setPhase("v1");
      setSecondsRemaining(18 * 60);
    } else if (phase === "v1") {
      setPhase("q1");
      setSecondsRemaining(21 * 60);
    } else if (phase === "q1") {
      const v1Score = v1Qs.filter((q) => evaluateQuestionAnswer(q, answers[q.id])).length;
      const band = determineSection2Difficulty(v1Score, v1Qs.length);
      setV2Band(band);
      setV2Qs(sampleSection("verbal", 15, band, new Set(v1Qs.map((q) => q.id))));
      setPhase("v2");
      setSecondsRemaining(23 * 60);
    } else if (phase === "v2") {
      const q1Score = q1Qs.filter((q) => evaluateQuestionAnswer(q, answers[q.id])).length;
      const band = determineSection2Difficulty(q1Score, q1Qs.length);
      setQ2Band(band);
      setQ2Qs(sampleSection("quant", 15, band, new Set(q1Qs.map((q) => q.id))));
      setPhase("q2");
      setSecondsRemaining(26 * 60);
    } else if (phase === "q2") {
      setPhase("results");
    }
  }

  useEffect(() => {
    if (phase === "intro" || phase === "results") return;
    const t = setInterval(() => {
      if (phase !== "awa" && currentQIdRef.current) {
        const qid = currentQIdRef.current;
        setQTimes((prev) => ({ ...prev, [qid]: (prev[qid] ?? 0) + 1 }));
      }
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          advancePhase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Persist adaptive ratings when results load
  useEffect(() => {
    if (phase !== "results" || !hydrated || recordedResults) return;
    setRecordedResults(true);
    for (const q of [...v1Qs, ...v2Qs, ...q1Qs, ...q2Qs]) {
      recordAnswer(q, evaluateQuestionAnswer(q, answers[q.id]));
    }
  }, [phase, hydrated, recordedResults, v1Qs, v2Qs, q1Qs, q2Qs, answers, recordAnswer]);

  if (phase === "intro") {
    return (
      <main className="container">
        <p style={{ marginBottom: "1rem" }}>
          <Link href="/" className="btn-ghost">&larr; Dashboard</Link>
        </p>
        <section className="exam-desk-panel">
          <span className="exam-meta-tag">
            FULL PRACTICE TEST · 1H 58M
          </span>
          <h1 style={{ marginTop: "0.75rem", color: "#ffffff" }}>Full GRE Practice Test</h1>
          <p>
            Follows the real test order with automatic Part 2 difficulty adjustment and a combined 260-340 score:
          </p>
          <ol style={{ lineHeight: 1.85, color: "#e2e8f0", paddingLeft: "1.25rem", marginBottom: "1.5rem" }}>
            <li><strong>Essay Writing:</strong> 1 Essay · 30 min</li>
            <li><strong>Verbal Part 1:</strong> 12 Questions · 18 min</li>
            <li><strong>Math Part 1:</strong> 12 Questions · 21 min</li>
            <li><strong>Verbal Part 2:</strong> 15 Questions · 23 min</li>
            <li><strong>Math Part 2:</strong> 15 Questions · 26 min</li>
          </ol>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="button" className="btn-accent" onClick={() => startFullMock(false)}>
              Start Full Test (With Essay, 1h 58m)
            </button>
            <button
              type="button"
              className="button"
              style={{ backgroundColor: "#ffffff", borderColor: "#ffffff", color: "#183654" }}
              onClick={() => startFullMock(true)}
            >
              Start Without Essay (1h 28m)
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === "results") {
    const v1Ok = v1Qs.filter((q) => evaluateQuestionAnswer(q, answers[q.id])).length;
    const v2Ok = v2Qs.filter((q) => evaluateQuestionAnswer(q, answers[q.id])).length;
    const q1Ok = q1Qs.filter((q) => evaluateQuestionAnswer(q, answers[q.id])).length;
    const q2Ok = q2Qs.filter((q) => evaluateQuestionAnswer(q, answers[q.id])).length;
    const verbalScaled = calculateAdaptiveGreScore("verbal", v1Ok, v2Ok, v2Band, v1Qs.length + v2Qs.length);
    const quantScaled = calculateAdaptiveGreScore("quant", q1Ok, q2Ok, q2Band, q1Qs.length + q2Qs.length);
    const totalScaled = verbalScaled + quantScaled;
    const allMissed = [...v1Qs, ...v2Qs, ...q1Qs, ...q2Qs].filter((q) => !evaluateQuestionAnswer(q, answers[q.id]));
    const awaWords = awaEssay.trim() ? awaEssay.trim().split(/\s+/).length : 0;

    return (
      <main className="container">
        <div className="exam-desk-panel">
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#dbeafe", textTransform: "uppercase", fontWeight: 700 }}>
            Full Shortened GRE Official-Style Score Report
          </p>
          <h1 style={{ fontSize: "clamp(1.75rem, 3.2vw, 2.4rem)", margin: "0.35rem 0 1rem", color: "#fcd34d" }}>
            Combined Total: {totalScaled} / 340
          </h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: 8 }}>
              <div style={{ fontSize: "0.8rem", color: "#dbeafe" }}>Verbal Reasoning</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ffffff" }}>{verbalScaled} / 170</div>
              <div style={{ fontSize: "0.78rem", color: "#e2e8f0" }}>S1: {v1Ok}/{v1Qs.length} &rarr; S2 ({v2Band}): {v2Ok}/{v2Qs.length}</div>
            </div>
            <div style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: 8 }}>
              <div style={{ fontSize: "0.8rem", color: "#dbeafe" }}>Quantitative Reasoning</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ffffff" }}>{quantScaled} / 170</div>
              <div style={{ fontSize: "0.78rem", color: "#e2e8f0" }}>S1: {q1Ok}/{q1Qs.length} &rarr; S2 ({q2Band}): {q2Ok}/{q2Qs.length}</div>
            </div>
            <div style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: 8 }}>
              <div style={{ fontSize: "0.8rem", color: "#dbeafe" }}>Analytical Writing (Issue)</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff" }}>{awaWords > 0 ? `${awaWords} words` : "Skipped"}</div>
              {awaWords > 0 && (
                <button
                  type="button"
                  className="btn-accent"
                  style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}
                  onClick={() => {
                    navigator.clipboard?.writeText(`${awaGuides.ai_diagnostic_prompt}\n\nPROMPT:\n${awaPrompt?.prompt}\n\nESSAY:\n${awaEssay}`);
                    setCopiedAwa(true);
                  }}
                >
                  {copiedAwa ? "Copied AI Prompt" : "Copy AWA AI Grader Prompt"}
                </button>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
            <Link href="/" className="button" style={{ backgroundColor: "#ffffff", borderColor: "#ffffff", color: "#183654" }}>
              Dashboard
            </Link>
            <Link href="/study/mistakes" className="btn-accent">
              Drill Missed Questions ({allMissed.length})
            </Link>
            <button
              type="button"
              className="button"
              style={{ backgroundColor: "rgba(255,255,255,0.16)", borderColor: "rgba(255,255,255,0.35)", color: "#ffffff" }}
              onClick={() => startFullMock(false)}
            >
              New Full Mock
            </button>
          </div>
        </div>

        <section className="surface-card">
          <h2 style={{ marginTop: 0 }}>Missed Questions Summary ({allMissed.length})</h2>
          {allMissed.length === 0 ? (
            <p>Flawless mock: 0 missed questions.</p>
          ) : (
            <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.6 }}>
              {allMissed.slice(0, 30).map((q) => (
                <li key={q.id} style={{ marginBottom: "0.6rem" }}>
                  <strong>[{q.section.toUpperCase()} · {q.topic.replace(/_/g, " ")} · {qTimes[q.id] || 0}s]</strong>{" "}
                  {q.explanation}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    );
  }

  const meta = PHASE_META[phase];
  const minLeft = Math.floor(secondsRemaining / 60);
  const secLeft = secondsRemaining % 60;
  const isQuantPhase = phase === "q1" || phase === "q2";

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900 font-sans flex flex-col justify-between">
      <header className="bg-[#1b3a5b] text-white select-none shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between text-sm gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (confirm("Quit Full Mock? Progress will be lost.")) router.push("/"); }}
              className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white font-bold rounded text-xs"
            >
              Quit
            </button>
            <span className="font-bold text-blue-200">{meta.label}</span>
          </div>

          {phase !== "awa" && (
            <div className="font-bold">Question {currentIndex + 1} of {activeQs.length}</div>
          )}

          <div className="flex items-center gap-2">
            {phase !== "awa" && currentQ && (
              <>
                <label className="flex items-center gap-1 cursor-pointer bg-white/10 px-2 py-1 rounded text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={!!marked[currentQ.id]}
                    onChange={() => setMarked((m) => ({ ...m, [currentQ.id]: !m[currentQ.id] }))}
                  />
                  Mark
                </label>
                <button
                  onClick={() => setIsReviewOpen(true)}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-bold"
                >
                  Review
                </button>
              </>
            )}
            {isQuantPhase && (
              <button
                onClick={() => setIsCalcOpen((v) => !v)}
                className="px-2.5 py-1 bg-amber-400 text-black rounded text-xs font-bold"
              >
                Calculator
              </button>
            )}
            <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded">
              {!isTimerHidden && (
                <span className={`font-mono font-bold ${secondsRemaining < 300 ? "text-amber-300" : "text-white"}`}>
                  {String(minLeft).padStart(2, "0")}:{String(secLeft).padStart(2, "0")}
                </span>
              )}
              <button onClick={() => setIsTimerHidden((h) => !h)} className="text-[11px] underline text-gray-300">
                {isTimerHidden ? "Show" : "Hide"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto p-6 flex-1">
        {phase === "awa" && awaPrompt ? (
          <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-sm space-y-4">
            <p className="font-serif text-lg italic">{awaPrompt.prompt}</p>
            <p className="text-sm text-gray-600 border-l-4 border-gray-300 pl-3">{awaPrompt.directions}</p>
            <textarea
              value={awaEssay}
              onChange={(e) => setAwaEssay(e.target.value)}
              placeholder="Write your Analyze an Issue essay (aim for 400–550 words)..."
              className="w-full min-h-[340px] border border-gray-300 rounded-lg p-3 font-serif text-base"
            />
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>{awaEssay.trim() ? awaEssay.trim().split(/\s+/).length : 0} words</span>
              <button onClick={advancePhase} className="px-5 py-2 bg-[#1b3a5b] text-white font-bold rounded-lg">
                Finish AWA &amp; Start Verbal Section 1 &rarr;
              </button>
            </div>
          </div>
        ) : currentQ ? (
          <div className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-sm min-h-[460px]">
            <ExamQuestionRenderer
              question={currentQ}
              currentAnswer={answers[currentQ.id]}
              onAnswerChange={(ans) => {
                setAnswers((prev) => ({ ...prev, [currentQ.id]: ans }));
                setCalcTransfer(null);
              }}
              calculatorTransferVal={calcTransfer}
            />
          </div>
        ) : null}
      </main>

      {isQuantPhase && (
        <GRECalculator isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} onTransferDisplay={(v) => setCalcTransfer(v)} />
      )}
      {phase !== "awa" && (
        <ReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          questions={activeQs}
          userAnswers={answers}
          markedQuestions={marked}
          onSelectQuestion={(idx) => setCurrentIndex(idx)}
          currentIndex={currentIndex}
        />
      )}

      {phase !== "awa" && (
        <footer className="bg-white border-t border-gray-300 py-3 px-6">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="px-5 py-2 rounded-lg text-sm font-bold border disabled:opacity-40"
            >
              &larr; Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={advancePhase}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold border rounded-lg"
              >
                Submit Section &rarr;
              </button>
              <button
                onClick={() => {
                  if (currentIndex < activeQs.length - 1) setCurrentIndex(currentIndex + 1);
                  else advancePhase();
                }}
                className="px-6 py-2 bg-[#1b3a5b] text-white text-sm font-bold rounded-lg"
              >
                {currentIndex === activeQs.length - 1 ? "Finish Section" : "Next \u2192"}
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
