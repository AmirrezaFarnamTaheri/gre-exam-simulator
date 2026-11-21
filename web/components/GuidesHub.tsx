"use client";

import { useState } from "react";
import greRef from "../../data/guides/gre_reference.json";

export default function GuidesHub() {
  const [tab, setTab] = useState<"formulas" | "rc" | "scoring" | "planner">("formulas");

  return (
    <main className="container">
      <div className="dash-header" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Reference Guides</h1>
        <div className="tab-row" role="tablist" aria-label="Reference sections" style={{ margin: 0 }}>
          {(
            [
              ["formulas", "Math Formulas"],
              ["rc", "Reading Tips"],
              ["scoring", "Scoring"],
              ["planner", "Study Plan"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={`tab-btn ${tab === k ? "active" : ""}`}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "formulas" && (
        <div className="topics-grid">
          {greRef.math_formulas.map((group) => (
            <section key={group.category} className="surface-card" style={{ marginBottom: 0 }}>
              <h2>{group.category}</h2>
              <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.7, marginBottom: 0 }}>
                {group.items.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: "0.35rem" }}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {tab === "rc" && (
        <section className="surface-card">
          <h2>Reading Strategy Tips</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "Georgia, Cambria, serif", lineHeight: 1.75, fontSize: "0.98rem", maxWidth: "72ch" }}>
            {greRef.rc_strategies}
          </pre>
        </section>
      )}

      {tab === "scoring" && (
        <div className="topics-grid">
          <section className="surface-card" style={{ marginBottom: 0 }}>
            <h2>Test Format (1h 58m Total)</h2>
            <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.75 }}>
              <li><strong>Essay Writing:</strong> 1 Issue essay (30 min).</li>
              <li><strong>Verbal:</strong> Part 1 (12 questions, 18 min) followed by Part 2 (15 questions, 23 min).</li>
              <li><strong>Math:</strong> Part 1 (12 questions, 21 min) followed by Part 2 (15 questions, 26 min).</li>
              <li><strong>How Part 2 Adjusts:</strong> 0-4 right in Part 1 gives an easier Part 2; 5-7 gives medium; 8-12 gives hard.</li>
            </ul>
          </section>

          <section className="surface-card" style={{ marginBottom: 0 }}>
            <h2>Test-Day Tips</h2>
            <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.75 }}>
              {greRef.exam_day_insights.map((tip, i) => (
                <li key={i} style={{ marginBottom: "0.45rem" }}>{tip}</li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === "planner" && (
        <section className="surface-card" style={{ overflowX: "auto" }}>
          <h2>Structured GRE Study Schedule</h2>
          {greRef.planner_schedule.length > 0 ? (
            <table>
              <tbody>
                {greRef.planner_schedule.map((row, rIdx) => (
                  <tr key={rIdx} style={rIdx === 0 ? { fontWeight: 700 } : undefined}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted-text">No schedule rows loaded yet.</p>
          )}
        </section>
      )}
    </main>
  );
}
