"use client";

import { useState } from "react";
import greRef from "../../data/guides/gre_reference.json";

export default function GuidesHub() {
  const [tab, setTab] = useState<"formulas" | "rc" | "writing" | "scoring" | "planner">("formulas");

  return (
    <main className="container">
      <div className="dash-header" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Reference Guides</h1>
        <div className="tab-row" role="tablist" aria-label="Reference sections" style={{ margin: 0 }}>
          {(
            [
              ["formulas", "Math Formulas"],
              ["rc", "Reading Tips"],
              ["writing", "Writing Craft"],
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

      {tab === "writing" && (
        <div className="topics-grid">
          <section className="surface-card" style={{ marginBottom: 0 }}>
            <h2>30-Minute Issue Essay Budget</h2>
            <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.7, marginBottom: 0 }}>
              <li style={{ marginBottom: "0.4rem" }}><strong>0-4 min (Outline):</strong> Pick a qualified stance, list 2 distinct reasons with concrete named examples, and pick 1 fair counterargument to rebut.</li>
              <li style={{ marginBottom: "0.4rem" }}><strong>4-26 min (Draft 400-550 words):</strong> Intro (context + qualified thesis) -&gt; Body 1 &amp; 2 (Claim -&gt; Mechanism -&gt; Example -&gt; Tie-back) -&gt; Body 3 (Concession + Scope Limit + Rebuttal) -&gt; 2-sentence Conclusion.</li>
              <li><strong>26-30 min (e-rater Proofread):</strong> Check comma splices, subject-verb agreement, missing articles, and high-risk spelling traps (no spellchecker on test day).</li>
            </ul>
          </section>

          <section className="surface-card" style={{ marginBottom: 0 }}>
            <h2>Transitions &amp; Punctuation Rules</h2>
            <table>
              <thead>
                <tr>
                  <th>Function</th>
                  <th>Expressions</th>
                  <th>Punctuation Rule</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Escalation</strong></td>
                  <td>moreover, furthermore</td>
                  <td>Period or semicolon before, comma after. Use only when strengthening the point.</td>
                </tr>
                <tr>
                  <td><strong>Contrast</strong></td>
                  <td>however, nevertheless, conversely</td>
                  <td>Never join two full clauses with <code>, however,</code>. Use <code>; however,</code>.</td>
                </tr>
                <tr>
                  <td><strong>Concession</strong></td>
                  <td>admittedly, while, although</td>
                  <td>Pair <em>Admittedly, [X]; yet [Y]</em> to show nuanced Band 5.5-6.0 reasoning.</td>
                </tr>
                <tr>
                  <td><strong>Emphasis</strong></td>
                  <td>Not only does..., Seldom have...</td>
                  <td>Use at most once per essay; invert auxiliary before subject.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="surface-card" style={{ marginBottom: 0 }}>
            <h2>6-Domain Example Bank (Avoid Vague Filler)</h2>
            <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.7, marginBottom: 0 }}>
              <li style={{ marginBottom: "0.35rem" }}><strong>Science &amp; Tech:</strong> General relativity enabling GPS timing; penicillin from unexpected lab work; open-source software ecosystems.</li>
              <li style={{ marginBottom: "0.35rem" }}><strong>Public Policy:</strong> Congestion pricing funding transit; clean-air rules spurring industrial innovation.</li>
              <li style={{ marginBottom: "0.35rem" }}><strong>Education:</strong> Cross-disciplinary ethics for AI engineers; written feedback vs. raw grades.</li>
              <li><strong>Economics &amp; History:</strong> Printing press expanding literacy; antitrust rules protecting startup competition.</li>
            </ul>
          </section>

          <section className="surface-card" style={{ marginBottom: 0 }}>
            <h2>High-Risk Unassisted Spelling &amp; Usage Traps</h2>
            <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.7, marginBottom: 0 }}>
              <li style={{ marginBottom: "0.35rem" }}><strong>Usage pairs:</strong> <em>affect</em> (verb) vs. <em>effect</em> (noun); <em>accept</em> vs. <em>except</em>; <em>advice</em> (noun) vs. <em>advise</em> (verb); <em>complement</em> (complete) vs. <em>compliment</em> (praise); <em>allude</em> vs. <em>elude</em>; <em>a lot</em> (two words).</li>
              <li style={{ marginBottom: "0.35rem" }}><strong>Double-letter traps:</strong> <em>accommodation, beginning, colleagues, committee, committed, necessary, occasion, occurred, opportunity, preferred, recommend, succeed</em>.</li>
              <li><strong>Silent/tricky vowels:</strong> <em>achievement, beneficial, convenient, environment, government, independence, maintenance, relevant, rhythm, separate, theoretical</em>.</li>
            </ul>
          </section>
        </div>
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
