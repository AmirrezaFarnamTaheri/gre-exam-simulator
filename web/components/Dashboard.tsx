"use client";

import Link from "next/link";
import { useRef } from "react";
import { exportState, getTopicSummary, importState, topicsForSection } from "gre-adaptive-engine";
import { BANK } from "@/lib/questionBank";
import { VOCAB } from "@/lib/vocab";
import { useAdaptiveState } from "@/lib/useAdaptiveState";

export default function Dashboard() {
  const { state, hydrated, replaceState } = useAdaptiveState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!hydrated) {
    return (
      <main className="container">
        <p className="muted-text">Loading...</p>
      </main>
    );
  }

  const verbalTopics = topicsForSection(BANK, "verbal");
  const quantTopics = topicsForSection(BANK, "quant");
  const verbalSummary = getTopicSummary(state, verbalTopics);
  const quantSummary = getTopicSummary(state, quantTopics);

  const latestByQ = new Map<string, boolean>();
  for (const a of state.attempts) latestByQ.set(a.questionId, a.correct);
  const unresolvedMistakes = [...latestByQ.values()].filter((ok) => !ok).length;

  function handleExport() {
    const blob = new Blob([exportState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gre-study-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      replaceState(importState(text));
    } catch {
      alert("That file does not match the GRE study progress export format.");
    }
    e.target.value = "";
  }

  return (
    <main className="container">
      {/* Compact Header + Inline Progress Summary */}
      <div className="dash-header">
        <div>
          <h1>GRE Practice</h1>
          <div className="bank-meta-strip">
            <span>Verbal <strong>{Math.round(state.sectionRatings.verbal)}</strong></span>
            <span>Math <strong>{Math.round(state.sectionRatings.quant)}</strong></span>
            <span><strong>{state.attempts.length}</strong> answered</span>
            <span><strong>{unresolvedMistakes}</strong> mistakes</span>
          </div>
        </div>
        <Link href="/exam/full" className="btn-accent">
          Start Full Test (1h 58m)
        </Link>
      </div>

      {/* Primary Action Grid: Timed Exams */}
      <section className="exam-desk-panel" aria-label="Timed GRE Exams">
        <div className="exam-hero-grid">
          <Link href="/exam/full" className="exam-mode-card primary-mock">
            <div className="exam-card-head">
              <span className="exam-card-title">Full Practice Test</span>
              <span className="exam-meta-tag">1h 58m</span>
            </div>
            <span className="exam-card-desc">
              Essay + Verbal &amp; Math with a combined 260-340 score.
            </span>
          </Link>

          <Link href="/exam/quant" className="exam-mode-card">
            <div className="exam-card-head">
              <span className="exam-card-title">Timed Math</span>
              <span className="exam-meta-tag">27 Q · 47m</span>
            </div>
            <span className="exam-card-desc">
              Two timed parts with calculator, charts, and tables.
            </span>
          </Link>

          <Link href="/exam/verbal" className="exam-mode-card">
            <div className="exam-card-head">
              <span className="exam-card-title">Timed Verbal</span>
              <span className="exam-meta-tag">27 Q · 41m</span>
            </div>
            <span className="exam-card-desc">
              Two timed parts with fill-in-the-blank, synonyms, and reading.
            </span>
          </Link>
        </div>

        <div className="exam-quick-links">
          <Link href="/exam/quant-s1">Short Math Test (12 Q, 21m)</Link>
          <Link href="/exam/verbal-s1">Short Verbal Test (12 Q, 18m)</Link>
        </div>
      </section>

      {/* Focused Untimed Practice */}
      <nav className="study-grid" aria-label="Study tools">
        <Link href="/courses" className="study-tile">
          <strong>Courses &amp; Lessons</strong>
          <span>Short topic lectures &amp; quick checks</span>
        </Link>
        <Link href="/study/verbal" className="study-tile">
          <strong>Verbal Practice</strong>
          <span>Fill-in-the-blank, synonyms &amp; reading</span>
        </Link>
        <Link href="/study/quant" className="study-tile">
          <strong>Math Practice</strong>
          <span>Focuses on your weaker topics</span>
        </Link>
        <Link href="/study/mistakes" className="study-tile">
          <strong>Mistakes ({unresolvedMistakes})</strong>
          <span>Retry missed questions</span>
        </Link>
        <Link href="/vocab" className="study-tile">
          <strong>Vocab ({VOCAB.length.toLocaleString()})</strong>
          <span>Flashcards &amp; synonym matching</span>
        </Link>
        <Link href="/awa" className="study-tile">
          <strong>Essay Writing</strong>
          <span>Timed essays &amp; outlines</span>
        </Link>
        <Link href="/guides" className="study-tile">
          <strong>Guides</strong>
          <span>Math formulas, reading tips &amp; scoring</span>
        </Link>
      </nav>

      {/* Collapsible Details: Topic Mastery & Local Backup */}
      <details className="surface-card dash-details" open={state.attempts.length > 0}>
        <summary className="dash-summary">
          <span>Progress by Topic &amp; Backup</span>
          <span className="muted-text" style={{ fontWeight: 500, fontSize: "0.85rem" }}>
            {verbalTopics.length + quantTopics.length} topics · {BANK.length.toLocaleString()} questions
          </span>
        </summary>

        <div className="topics-grid" style={{ marginTop: "1rem" }}>
          <TopicTable title="Verbal Topics" rows={verbalSummary} />
          <TopicTable title="Math Topics" rows={quantSummary} />
        </div>

        <div className="backup-actions">
          <button type="button" className="btn-ghost" onClick={handleExport}>
            Save Backup
          </button>
          <button type="button" className="btn-ghost" onClick={() => fileInputRef.current?.click()}>
            Load Backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            aria-label="Import progress JSON file"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
        </div>
      </details>
    </main>
  );
}

function TopicTable({ title, rows }: { title: string; rows: ReturnType<typeof getTopicSummary> }) {
  return (
    <section className="topic-table">
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th>Topic</th>
            <th>Score</th>
            <th>Level</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pct = Math.max(6, Math.min(100, Math.round(((r.rating - 600) / 800) * 100)));
            return (
              <tr key={r.topic}>
                <td className="capitalize">{r.topic.replace(/_/g, " ")}</td>
                <td className="font-mono">{Math.round(r.rating)}</td>
                <td>
                  <div className="mastery-bar-track" aria-label={`Mastery ${pct}%`}>
                    <div className="mastery-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </td>
                <td className="font-mono">
                  {r.accuracy === null ? "New" : `${Math.round(r.accuracy * 100)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
