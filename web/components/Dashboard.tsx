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
      <h1>GRE Adaptive Study & Exam Simulator</h1>

      <section className="section-ratings">
        <div className="rating-card">
          <h2>Verbal Rating</h2>
          <p className="rating-value">{Math.round(state.sectionRatings.verbal)}</p>
        </div>
        <div className="rating-card">
          <h2>Quant Rating</h2>
          <p className="rating-value">{Math.round(state.sectionRatings.quant)}</p>
        </div>
      </section>

      {/* ETS Real Exam Simulator Modes */}
      <section style={{ backgroundColor: "#1b3a5b", color: "#fff", padding: "1.5rem", borderRadius: "10px", margin: "1.5rem 0", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span style={{ backgroundColor: "#f59e0b", color: "#000", fontSize: "11px", fontWeight: "900", padding: "2px 6px", borderRadius: "4px" }}>ETS EXAM SIMULATOR</span>
          <h2 style={{ fontSize: "1.25rem", margin: 0, fontWeight: "bold" }}>Timed Section Mode</h2>
        </div>
        <p style={{ fontSize: "0.85rem", color: "#bfdbfe", margin: "0 0 1rem 0" }}>
          Official ETS test conditions: countdown timer (Hide/Show), on-screen calculator, Mark for Review, and Review Grid. Zero spoilers during the test.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Link
            href="/exam/quant"
            style={{ display: "block", padding: "1rem", backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "8px", textDecoration: "none", color: "#fff" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "bold", fontSize: "1rem" }}>
              <span>Quant Section &rarr;</span>
              <span style={{ backgroundColor: "#10b981", fontSize: "11px", padding: "2px 6px", borderRadius: "4px" }}>12 Q • 21 Min</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#e2e8f0", marginTop: "4px" }}>
              Includes on-screen calculator & review table
            </div>
          </Link>

          <Link
            href="/exam/verbal"
            style={{ display: "block", padding: "1rem", backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "8px", textDecoration: "none", color: "#fff" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "bold", fontSize: "1rem" }}>
              <span>Verbal Section &rarr;</span>
              <span style={{ backgroundColor: "#10b981", fontSize: "11px", padding: "2px 6px", borderRadius: "4px" }}>12 Q • 18 Min</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#e2e8f0", marginTop: "4px" }}>
              Text Completion, SE & Reading Comprehension
            </div>
          </Link>
        </div>
      </section>

      <h3 style={{ marginTop: "1.5rem", marginBottom: "0.5rem", fontSize: "1.1rem", fontWeight: "bold" }}>Untimed Adaptive Practice</h3>
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
        <Link href="/vocab" className="button">
          Vocabulary (SRS)
        </Link>
        <Link href="/awa" className="button" style={{ backgroundColor: "#7c3aed", borderColor: "#7c3aed" }}>
          AWA Writing Practice
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
