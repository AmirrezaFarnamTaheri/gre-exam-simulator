"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import awaData from "../../data/questions/awa.json";

interface AwaPrompt {
  id: string;
  type: "issue" | "argument";
  prompt: string;
  directions: string;
  source: string;
}

const ALL: AwaPrompt[] = awaData as AwaPrompt[];
const ISSUE = ALL.filter((p) => p.type === "issue");
const ARGUMENT = ALL.filter((p) => p.type === "argument");

const ISSUE_RUBRIC = [
  "I stated a clear position on the issue.",
  "I provided at least two distinct reasons supporting my position.",
  "I addressed at least one counterargument or concession.",
  "I used at least one concrete example or analogy.",
  "My response is at least 300 words.",
  "My essay has a clear introduction, body, and conclusion.",
  "My writing is free of major grammatical errors.",
];

const ARGUMENT_RUBRIC = [
  "I identified the main conclusion of the argument.",
  "I identified at least two logical flaws or unwarranted assumptions.",
  "I explained what evidence would strengthen or weaken each flaw.",
  "I did not express my personal opinion on the issue itself.",
  "My response is at least 300 words.",
  "My essay has a clear structure addressing multiple flaws.",
  "My writing is free of major grammatical errors.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const KEY = "gre-awa-history-v1";

function loadHistory(): string[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function saveHistory(ids: string[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(ids.slice(-50))); // keep last 50
}

export default function AwaSession() {
  const [tab, setTab] = useState<"issue" | "argument">("issue");
  const [prompt, setPrompt] = useState<AwaPrompt | null>(null);
  const [essay, setEssay] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [checklist, setChecklist] = useState<boolean[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => { setHistory(loadHistory()); }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  function fmt(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function nextPrompt() {
    const pool = tab === "issue" ? ISSUE : ARGUMENT;
    const unseen = pool.filter((p) => !history.includes(p.id));
    const chosen = pick(unseen.length > 0 ? unseen : pool);
    setPrompt(chosen);
    setEssay("");
    setSubmitted(false);
    setChecklist([]);
    setElapsed(0);
    setRunning(true);
  }

  function handleSubmit() {
    setRunning(false);
    setSubmitted(true);
    const rubric = tab === "issue" ? ISSUE_RUBRIC : ARGUMENT_RUBRIC;
    setChecklist(new Array(rubric.length).fill(false));
    if (prompt) {
      const updated = [...history, prompt.id];
      setHistory(updated);
      saveHistory(updated);
    }
  }

  function toggleCheck(i: number) {
    setChecklist((c) => c.map((v, idx) => (idx === i ? !v : v)));
  }

  const rubric = tab === "issue" ? ISSUE_RUBRIC : ARGUMENT_RUBRIC;
  const score = submitted ? Math.round((checklist.filter(Boolean).length / rubric.length) * 6) : null;
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;

  return (
    <main className="container">
      <p><Link href="/">&larr; Dashboard</Link></p>
      <h1>GRE Analytical Writing (AWA)</h1>
      <p style={{ color: "var(--muted)" }}>
        {ISSUE.length} Issue + {ARGUMENT.length} Argument prompts from the official ETS pool
      </p>

      {/* Tab selector */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {(["issue", "argument"] as const).map((t) => (
          <button
            key={t}
            className="button"
            style={tab === t ? { backgroundColor: "#7c3aed", borderColor: "#7c3aed" } : {}}
            onClick={() => { setTab(t); setPrompt(null); setSubmitted(false); setEssay(""); setElapsed(0); setRunning(false); }}
          >
            {t === "issue" ? `Issue (${ISSUE.length})` : `Argument (${ARGUMENT.length})`}
          </button>
        ))}
      </div>

      {!prompt ? (
        <section style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "1.5rem" }}>
          <h2>{tab === "issue" ? "Analyze an Issue" : "Analyze an Argument"}</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            {tab === "issue"
              ? "You will be presented with an issue and specific instructions. Write a response addressing the issue. Time: 30 minutes."
              : "You will be presented with an argument and specific instructions. Analyze the reasoning—do not express your own views. Time: 30 minutes."}
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            Seen: {history.filter((id) => id.startsWith(tab === "issue" ? "awa_issue" : "awa_arg")).length} /{" "}
            {tab === "issue" ? ISSUE.length : ARGUMENT.length} prompts
          </p>
          <button className="button" onClick={nextPrompt}>Get a prompt</button>
        </section>
      ) : !submitted ? (
        <section style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>
              {tab === "issue" ? "Issue Task" : "Argument Task"}
            </span>
            <span style={{
              fontFamily: "monospace", fontSize: "1.1rem",
              color: elapsed > 1800 ? "#ef4444" : "var(--muted)"
            }}>
              ⏱ {fmt(elapsed)} {elapsed > 1800 && "⚠️"}
            </span>
          </div>
          <p style={{ fontStyle: "italic", lineHeight: 1.6 }}>{prompt.prompt}</p>
          {prompt.directions && (
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.75rem", borderLeft: "3px solid var(--border)", paddingLeft: "0.75rem" }}>
              {prompt.directions}
            </p>
          )}
          <textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            placeholder="Write your response here…"
            style={{
              width: "100%", minHeight: 300, marginTop: "1rem", padding: "0.75rem",
              fontFamily: "inherit", fontSize: "0.95rem", lineHeight: 1.6,
              border: "1px solid var(--border)", borderRadius: 6,
              backgroundColor: "var(--bg)", color: "var(--text)", resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{wordCount} words</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="button" onClick={nextPrompt}>New prompt</button>
              <button className="button" onClick={handleSubmit} disabled={wordCount < 50}
                style={{ backgroundColor: "#0f766e", borderColor: "#0f766e" }}>
                Submit &amp; Self-Grade
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "1.5rem" }}>
          <h2>Self-Assessment Rubric</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            Time: {fmt(elapsed)} &middot; {wordCount} words &middot; Check each criterion you met:
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {rubric.map((item, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0", borderBottom: "1px solid var(--border)" }}>
                <input type="checkbox" checked={checklist[i] || false} onChange={() => toggleCheck(i)}
                  style={{ width: 18, height: 18, cursor: "pointer" }} />
                <label style={{ cursor: "pointer", fontSize: "0.9rem" }} onClick={() => toggleCheck(i)}>{item}</label>
              </li>
            ))}
          </ul>
          {score !== null && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "#134e4a", color: "#fff", borderRadius: 8 }}>
              <strong>Estimated band: {score}/6</strong>
              <span style={{ marginLeft: "0.75rem", fontSize: "0.85rem", color: "#ccfbf1" }}>
                ({checklist.filter(Boolean).length}/{rubric.length} criteria met)
              </span>
            </div>
          )}
          <div style={{ marginTop: "1rem" }}>
            <p style={{ fontStyle: "italic", fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.5 }}>
              <strong>Your prompt:</strong> {prompt.prompt}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>
              <strong>Your response:</strong>{"\n"}{essay}
            </p>
          </div>
          <button className="button" style={{ marginTop: "1rem" }} onClick={nextPrompt}>Next prompt</button>
        </section>
      )}
    </main>
  );
}
