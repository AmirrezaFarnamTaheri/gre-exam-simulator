"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnyQuestion } from "gre-adaptive-engine";
import { ALL_QUESTIONS } from "@/lib/questionBank";
import { getQuestionExamTarget, QTYPE_FILTER_LABELS, type QuestionType } from "@/lib/examTargets";
import { useAdaptiveState } from "@/lib/useAdaptiveState";
import { postGreResult } from "@/lib/resultsSync";
import awaData from "../../../data/questions/awa.json";
import sampleEssaysRaw from "../../../data/awa/sample_essays.json";
import GRECalculator from "./GRECalculator";
import ReviewModal from "./ReviewModal";
import ExamQuestionRenderer from "./ExamQuestionRenderer";
import { evaluateQuestionAnswer } from "./ExamResults";

type DiagPhase = "intro" | "verbal" | "quant" | "awa" | "results";

interface AwaPrompt {
  id: string;
  type: "issue" | "argument";
  prompt: string;
  directions: string;
  brainstorm?: string[];
}

const SAMPLE_ESSAYS = sampleEssaysRaw as Record<string, { wordCount: number; essay: string }>;

const VERBAL_DIAG_IDS = [
  "v-tc-01",
  "v-tc-04",
  "v-tc-11",
  "v-se-01",
  "v-se-09",
  "gre-study-rc-music-1",
  "gre-study-rc-music-2",
  "gre-study-rc-music-sentence",
  "gre-study-rc-soil-1",
  "gre-study-rc-soil-3",
];

const QUANT_DIAG_IDS = [
  "foundation-17",
  "foundation-18",
  "foundation-19",
  "foundation-20",
  "q-ar-03",
  "q-ar-25",
  "q-al-01",
  "q-ge-03",
  "di_01_1",
  "di_01_2",
];

function resolveQuestions(ids: string[]): AnyQuestion[] {
  const byId = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));
  return ids.map((id) => byId.get(id)).filter((q): q is AnyQuestion => Boolean(q));
}

function fmt(sec: number) {
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

export default function DiagnosticExamSession() {
  const { recordAnswer, hydrated } = useAdaptiveState();
  const verbalQs = useMemo(() => resolveQuestions(VERBAL_DIAG_IDS), []);
  const quantQs = useMemo(() => resolveQuestions(QUANT_DIAG_IDS), []);
  const awaPrompt = useMemo(() => {
    const issues = (awaData as AwaPrompt[]).filter((p) => p.type === "issue");
    return issues.find((p) => Boolean(SAMPLE_ESSAYS[p.id])) || issues[0];
  }, []);

  const [phase, setPhase] = useState<DiagPhase>("intro");
  const [includeAwa, setIncludeAwa] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [timings, setTimings] = useState<Record<string, number>>({});
  const [awaEssay, setAwaEssay] = useState("");
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [calcTransfer, setCalcTransfer] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [copiedEssay, setCopiedEssay] = useState(false);

  const activeQs = phase === "verbal" ? verbalQs : phase === "quant" ? quantQs : [];
  const currentQ = activeQs[currentIndex];
  const currentIdRef = useRef<string | null>(null);
  currentIdRef.current = currentQ?.id ?? null;

  useEffect(() => {
    if (phase === "intro" || phase === "results") return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          advancePhase();
          return 0;
        }
        return prev - 1;
      });
      if (currentIdRef.current) {
        const qid = currentIdRef.current;
        setTimings((t) => ({ ...t, [qid]: (t[qid] || 0) + 1 }));
      }
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, includeAwa]);

  useEffect(() => {
    if (phase !== "results" || !hydrated || recorded) return;
    const allQs = [...verbalQs, ...quantQs];
    for (const q of allQs) {
      recordAnswer(q, evaluateQuestionAnswer(q, answers[q.id]));
    }
    const verbalCorrect = verbalQs.filter((q) => evaluateQuestionAnswer(q, answers[q.id])).length;
    const quantCorrect = quantQs.filter((q) => evaluateQuestionAnswer(q, answers[q.id])).length;
    const awaWords = awaEssay.trim() ? awaEssay.trim().split(/\s+/).length : 0;
    postGreResult({
      kind: "run",
      id: `gre-diag-${Date.now()}`,
      runType: "diagnostic",
      title: "GRE Evaluation Diagnostic",
      scores: {
        verbal: { correct: verbalCorrect, total: verbalQs.length },
        quant: { correct: quantCorrect, total: quantQs.length },
        awaWords: includeAwa ? awaWords : null,
      },
      details: {
        items: allQs.map((q) => ({
          id: q.id,
          section: q.section,
          qtype: q.qtype,
          topic: q.topic,
          correct: evaluateQuestionAnswer(q, answers[q.id]),
          elapsedSec: timings[q.id] || 0,
        })),
      },
      awa: includeAwa && awaEssay.trim() && awaPrompt
        ? { prompt: awaPrompt.prompt, essay: awaEssay, wordCount: awaWords }
        : undefined,
    });
    setRecorded(true);
  }, [phase, hydrated, recorded, verbalQs, quantQs, answers, timings, includeAwa, awaEssay, awaPrompt, recordAnswer]);

  function startDiagnostic(withAwa: boolean) {
    setIncludeAwa(withAwa);
    setAnswers({});
    setMarked({});
    setTimings({});
    setAwaEssay("");
    setCurrentIndex(0);
    setRecorded(false);
    setShowSample(false);
    setCopiedEssay(false);
    setPhase("verbal");
    setSecondsLeft(15 * 60);
  }

  function advancePhase() {
    setIsCalcOpen(false);
    setIsReviewOpen(false);
    setCurrentIndex(0);
    if (phase === "verbal") {
      setPhase("quant");
      setSecondsLeft(17 * 60);
    } else if (phase === "quant") {
      if (includeAwa) {
        setPhase("awa");
        setSecondsLeft(20 * 60);
      } else {
        setPhase("results");
        setSecondsLeft(0);
      }
    } else if (phase === "awa") {
      setPhase("results");
      setSecondsLeft(0);
    }
  }

  if (phase === "intro") {
    return (
      <main className="container">
        <p style={{ marginBottom: "0.75rem" }}>
          <Link href="/tests" className="back-link">&larr; Timed tests</Link>
        </p>
        <section className="exam-desk-panel">
          <h1 style={{ marginTop: "0.25rem", color: "#ffffff" }}>GRE Evaluation Diagnostic</h1>
          <p>
            Test every GRE question format in one short sitting so your 30-day study plan is based on real scores, not guesswork.
          </p>
          <div className="exam-stage-grid">
            <div className="exam-stage-card">
              <div className="exam-stage-meta">Part 1 · 15 min · 10 Q</div>
              <div className="exam-stage-title">Verbal Diagnostic</div>
              <p className="exam-stage-desc">1/2/3-Blank Text Completion, Sentence Equivalence, Single-Choice RC, Select-All RC, and Select-in-Passage.</p>
            </div>
            <div className="exam-stage-card">
              <div className="exam-stage-meta">Part 2 · 17 min · 10 Q</div>
              <div className="exam-stage-title">Math Diagnostic</div>
              <p className="exam-stage-desc">Quantitative Comparison traps, Problem Solving (Single &amp; Select-All), Numeric Entry, and Data Interpretation.</p>
            </div>
            <div className="exam-stage-card">
              <div className="exam-stage-meta">Part 3 · 20 min · Optional</div>
              <div className="exam-stage-title">Issue Essay Sprint</div>
              <p className="exam-stage-desc">Write a structured Issue draft and compare it side-by-side against a full sample essay.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="button" className="btn-accent" onClick={() => startDiagnostic(true)}>
              Start Full Diagnostic (52 min, with Essay)
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ backgroundColor: "#ffffff", borderColor: "#ffffff", color: "#183654" }}
              onClick={() => startDiagnostic(false)}
            >
              Start Verbal + Math Only (32 min)
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === "results") {
    const allQs = [...verbalQs, ...quantQs];
    const verbalCorrect = verbalQs.filter((q) => evaluateQuestionAnswer(q, answers[q.id])).length;
    const quantCorrect = quantQs.filter((q) => evaluateQuestionAnswer(q, answers[q.id])).length;
    const missed = allQs.filter((q) => !evaluateQuestionAnswer(q, answers[q.id]));
    const awaWords = awaEssay.trim() ? awaEssay.trim().split(/\s+/).length : 0;

    // Build format-by-format breakdown
    const formatOrder: QuestionType[] = [
      "text_completion",
      "sentence_equivalence",
      "reading_comprehension",
      "quant_comparison",
      "quant_multiple_choice",
      "quant_numeric_entry",
      "data_interpretation",
    ];
    const breakdown = formatOrder
      .map((qt) => {
        const subset = allQs.filter((q) => q.qtype === qt);
        if (!subset.length) return null;
        const ok = subset.filter((q) => evaluateQuestionAnswer(q, answers[q.id])).length;
        const avgSec = Math.round(subset.reduce((s, q) => s + (timings[q.id] || 0), 0) / subset.length);
        const targetSec = getQuestionExamTarget(subset[0]).pacingSeconds;
        const pct = Math.round((ok / subset.length) * 100);
        const section = subset[0].section;
        const priority = pct < 60 ? "Top Priority" : pct < 85 || avgSec > targetSec * 1.25 ? "Refine & Speed Up" : "Strong";
        return { qt, label: QTYPE_FILTER_LABELS[qt], section, ok, total: subset.length, pct, avgSec, targetSec, priority };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const priorities = [...breakdown].sort((a, b) => a.pct - b.pct || b.avgSec - a.avgSec).slice(0, 3);
    const sample = awaPrompt ? SAMPLE_ESSAYS[awaPrompt.id] : undefined;

    return (
      <main className="container">
        <div className="exam-desk-panel">
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#dbeafe", textTransform: "uppercase", fontWeight: 700 }}>
            GRE Evaluation Diagnostic Report
          </p>
          <h1 style={{ fontSize: "clamp(1.75rem, 3.2vw, 2.3rem)", margin: "0.35rem 0 1rem", color: "#fcd34d" }}>
            Verbal {verbalCorrect}/{verbalQs.length} · Math {quantCorrect}/{quantQs.length}
          </h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem" }}>
            <div style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: 8 }}>
              <div style={{ fontSize: "0.8rem", color: "#dbeafe" }}>Verbal Accuracy</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#ffffff" }}>{Math.round((verbalCorrect / Math.max(1, verbalQs.length)) * 100)}%</div>
              <div style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>{verbalCorrect} of {verbalQs.length} correct</div>
            </div>
            <div style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: 8 }}>
              <div style={{ fontSize: "0.8rem", color: "#dbeafe" }}>Math Accuracy</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#ffffff" }}>{Math.round((quantCorrect / Math.max(1, quantQs.length)) * 100)}%</div>
              <div style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>{quantCorrect} of {quantQs.length} correct</div>
            </div>
            <div style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: 8 }}>
              <div style={{ fontSize: "0.8rem", color: "#dbeafe" }}>Essay Writing</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#ffffff" }}>{includeAwa ? `${awaWords} words` : "Skipped"}</div>
              <div style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>
                {includeAwa ? (awaWords >= 400 ? "Strong length for 5.0-6.0" : "Aim for 450-550 words") : "Practice on /awa anytime"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
            <Link href="/study/mistakes" className="btn-accent">
              Retry missed questions ({missed.length})
            </Link>
            <Link href="/progress" className="button" style={{ backgroundColor: "#ffffff", borderColor: "#ffffff", color: "#183654" }}>
              See Progress
            </Link>
            <button
              type="button"
              className="btn-ghost"
              style={{ backgroundColor: "rgba(255,255,255,0.16)", borderColor: "rgba(255,255,255,0.35)", color: "#ffffff" }}
              onClick={() => setPhase("intro")}
            >
              Retake Diagnostic
            </button>
          </div>
        </div>

        <section className="surface-card">
          <h2 style={{ marginTop: 0 }}>Recommended Week 1 Focus (Based on Actual Results)</h2>
          <ol style={{ paddingLeft: "1.25rem", lineHeight: 1.7 }}>
            {priorities.map((p) => (
              <li key={p.qt} style={{ marginBottom: "0.45rem" }}>
                <strong>{p.label}</strong>: {p.ok}/{p.total} ({p.pct}%), avg {p.avgSec}s/Q (target {p.targetSec}s).{" "}
                <Link href={`/study/${p.section}`}>Drill {p.section === "quant" ? "Math" : "Verbal"} &rarr;</Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="surface-card">
          <h2 style={{ marginTop: 0 }}>Score &amp; Pacing by Exam Task Format</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.5rem" }}>Exam Task Format</th>
                  <th style={{ textAlign: "left", padding: "0.5rem" }}>Score</th>
                  <th style={{ textAlign: "left", padding: "0.5rem" }}>Avg Pace</th>
                  <th style={{ textAlign: "left", padding: "0.5rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => (
                  <tr key={row.qt} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.55rem 0.5rem", fontWeight: 600 }}>{row.label}</td>
                    <td style={{ padding: "0.55rem 0.5rem" }} className="font-mono">{row.ok}/{row.total} ({row.pct}%)</td>
                    <td style={{ padding: "0.55rem 0.5rem" }} className="font-mono">{row.avgSec}s / {row.targetSec}s</td>
                    <td style={{ padding: "0.55rem 0.5rem" }}>{row.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {includeAwa && awaPrompt && (
          <section className="surface-card">
            <h2 style={{ marginTop: 0 }}>Essay Review</h2>
            <p className="muted-text" style={{ marginTop: 0 }}>{awaPrompt.prompt}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "0.75rem" }}>
              {awaWords > 0 && (
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `Grade my GRE Analyze an Issue essay (0.0-6.0) with 2 concrete upgrades.\n\nPROMPT:\n${awaPrompt.prompt}\n\nESSAY:\n${awaEssay}`
                    );
                    setCopiedEssay(true);
                  }}
                >
                  {copiedEssay ? "Copied essay for feedback" : "Copy essay for AI feedback"}
                </button>
              )}
              {sample && (
                <button type="button" className="btn-ghost" onClick={() => setShowSample((s) => !s)}>
                  {showSample ? "Hide Sample Essay" : `Show Sample Essay (${sample.wordCount} words)`}
                </button>
              )}
            </div>
            {showSample && sample && (
              <div className="explanation" style={{ whiteSpace: "pre-line", maxHeight: 340, overflowY: "auto" }}>
                {sample.essay}
              </div>
            )}
          </section>
        )}

        <section className="surface-card">
          <h2 style={{ marginTop: 0 }}>Missed Questions ({missed.length})</h2>
          {missed.length === 0 ? (
            <p>Perfect score across all 20 diagnostic questions.</p>
          ) : (
            <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.65 }}>
              {missed.map((q) => (
                <li key={q.id} style={{ marginBottom: "0.6rem" }}>
                  <strong>{QTYPE_FILTER_LABELS[q.qtype]}</strong> ({q.topic.replace(/_/g, " ")}): {q.explanation}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#eaecef] text-gray-900 font-sans">
      <header className="bg-[#1b3a5b] text-white shadow-md select-none">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div>
            <div className="font-bold">
              {phase === "verbal"
                ? "Diagnostic Part 1: Verbal Reasoning (10 Q)"
                : phase === "quant"
                  ? "Diagnostic Part 2: Quantitative Reasoning (10 Q)"
                  : "Diagnostic Part 3: Analytical Writing (Issue)"}
            </div>
            <div className="text-xs text-blue-200">GRE Evaluation Diagnostic</div>
          </div>

          {phase !== "awa" && (
            <div className="font-bold">Question {currentIndex + 1} of {activeQs.length}</div>
          )}

          <div className="test-tools flex items-center gap-2">
            {phase !== "awa" && currentQ && (
              <>
                <label className="flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/20 px-3 min-h-[44px] rounded text-xs font-bold text-white border border-white/20">
                  <input
                    type="checkbox"
                    checked={Boolean(marked[currentQ.id])}
                    onChange={() =>
                      setMarked((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))
                    }
                  />
                  Mark
                </label>
                <button type="button" onClick={() => setIsReviewOpen(true)} className="px-3 min-h-[44px] bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded text-xs font-bold">
                  Review
                </button>
              </>
            )}
            {phase === "quant" && (
              <button type="button" onClick={() => setIsCalcOpen((v) => !v)} className="px-3 min-h-[44px] bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded text-xs font-bold">
                Calculator
              </button>
            )}
            <span className="font-mono font-bold bg-black/25 text-white px-3 py-2 rounded border border-white/10">{fmt(secondsLeft)}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto p-6 flex-1">
        {phase === "awa" && awaPrompt ? (
          <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-sm space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg font-serif text-base leading-relaxed">
              <p className="italic m-0">{awaPrompt.prompt}</p>
              {awaPrompt.directions && <p className="text-sm text-gray-600 mt-2 mb-0">{awaPrompt.directions}</p>}
            </div>
            <textarea
              value={awaEssay}
              onChange={(e) => setAwaEssay(e.target.value)}
              placeholder="Write your essay response here (aim for 400-550 words)..."
              className="w-full min-h-[340px] p-4 border-2 border-gray-300 rounded-lg font-serif text-base leading-relaxed"
            />
            <div className="flex justify-between items-center text-sm">
              <span className="font-mono font-bold text-gray-700">
                Words: {awaEssay.trim() ? awaEssay.trim().split(/\s+/).length : 0}
              </span>
              <button type="button" onClick={advancePhase} className="px-5 py-2 bg-[#1b3a5b] text-white font-bold rounded-lg">
                Finish Diagnostic &amp; View Report &rarr;
              </button>
            </div>
          </div>
        ) : currentQ ? (
          <div className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-sm min-h-[460px]">
            <ExamQuestionRenderer
              question={currentQ}
              currentAnswer={answers[currentQ.id]}
              onAnswerChange={(val) => setAnswers((prev) => ({ ...prev, [currentQ.id]: val }))}
              calculatorTransferVal={calcTransfer}
            />
          </div>
        ) : null}
      </main>

      {phase === "quant" && (
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
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="px-5 py-2 rounded-lg text-sm font-bold border disabled:opacity-40"
            >
              &larr; Back
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={advancePhase} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold border rounded-lg">
                Submit Part &rarr;
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentIndex < activeQs.length - 1) setCurrentIndex(currentIndex + 1);
                  else advancePhase();
                }}
                className="px-6 py-2 bg-[#1b3a5b] text-white text-sm font-bold rounded-lg"
              >
                {currentIndex === activeQs.length - 1 ? "Finish Part" : "Next \u2192"}
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
