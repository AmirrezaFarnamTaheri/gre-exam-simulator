"use client";

import Link from "next/link";
import { useRef } from "react";
import { exportState, getTopicSummary, importState, topicsForSection } from "gre-adaptive-engine";
import { BANK } from "@/lib/questionBank";
import { useAdaptiveState } from "@/lib/useAdaptiveState";

export default function Dashboard() {
  const { state, hydrated, replaceState } = useAdaptiveState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!hydrated) {
    return (
      <main className="container">
        <p>Loading your progress...</p>
      </main>
    );
  }

  const verbalTopics = topicsForSection(BANK, "verbal");
  const quantTopics = topicsForSection(BANK, "quant");
  const verbalSummary = getTopicSummary(state, verbalTopics);
  const quantSummary = getTopicSummary(state, quantTopics);

  function handleExport() {
    const blob = new Blob([exportState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gre-study-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      replaceState(importState(text));
    } catch {
      alert("That file doesn't look like a valid progress export.");
    }
    e.target.value = "";
  }

  return (
    <main className="container">
      <h1>GRE Adaptive Study</h1>

      <section className="section-ratings">
        <div className="rating-card">
          <h2>Verbal</h2>
          <p className="rating-value">{Math.round(state.sectionRatings.verbal)}</p>
        </div>
        <div className="rating-card">
          <h2>Quant</h2>
          <p className="rating-value">{Math.round(state.sectionRatings.quant)}</p>
        </div>
      </section>

      <nav className="study-links">
        <Link href="/study/verbal" className="button">
          Study Verbal
        </Link>
        <Link href="/study/quant" className="button">
          Study Quant
        </Link>
        <Link href="/study/mixed" className="button">
          Study Mixed
        </Link>
      </nav>

      <TopicTable title="Verbal topics" rows={verbalSummary} />
      <TopicTable title="Quant topics" rows={quantSummary} />

      <section className="backup-actions">
        <button onClick={handleExport}>Export progress</button>
        <button onClick={handleImportClick}>Import progress</button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={handleImportFile}
        />
      </section>
    </main>
  );
}

function TopicTable({ title, rows }: { title: string; rows: ReturnType<typeof getTopicSummary> }) {
  return (
    <section className="topic-table">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            <th>Topic</th>
            <th>Rating</th>
            <th>Attempts</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.topic}>
              <td>{r.topic.replace(/_/g, " ")}</td>
              <td>{Math.round(r.rating)}</td>
              <td>{r.attempts}</td>
              <td>{r.accuracy === null ? "—" : `${Math.round(r.accuracy * 100)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
