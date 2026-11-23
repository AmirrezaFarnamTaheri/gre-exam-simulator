"use client";

import { useEffect, useState } from "react";
import awaData from "../../data/questions/awa.json";
import awaGuides from "../../data/awa/guides.json";
import sampleEssaysRaw from "../../data/awa/sample_essays.json";
import { postGreResult } from "@/lib/resultsSync";

const SAMPLE_ESSAYS = sampleEssaysRaw as Record<string, { wordCount: number; essay: string }>;

interface AwaPrompt {
  id: string;
  type: "issue" | "argument";
  prompt: string;
  directions: string;
  source: string;
  brainstorm?: string[];
}

const ALL: AwaPrompt[] = awaData as AwaPrompt[];
const ISSUE = ALL.filter((p) => p.type === "issue");
const ARGUMENT = ALL.filter((p) => p.type === "argument");

const ISSUE_RUBRIC = [
  "Clear, nuanced position stated in the opening paragraph.",
  "At least two distinct supporting reasons developed in separate body paragraphs.",
  "At least one counterargument or concession addressed directly.",
  "Concrete historical, scientific, or real-world example included.",
  "Well-developed length (400 to 550 words for 4.5 to 6.0 range).",
  "Clear paragraph transitions, topic sentences, and concise conclusion.",
  "Clean grammar, spelling, and sentence variety for ETS e-rater.",
];

const ARGUMENT_RUBRIC = [
  "Main conclusion of the argument identified accurately.",
  "At least two logical flaws or unwarranted assumptions explained.",
  "Specific evidence needed to evaluate each flaw described.",
  "Personal opinion on the issue avoided.",
  "At least 350 words with organized flaw-by-flaw paragraphs.",
  "Clean grammar and precise analytical phrasing.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const KEY = "gre-awa-history-v1";
const AI_KEY = "gre-awa-ai-config-v1";

function loadHistory(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(ids: string[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(ids.slice(-80)));
}

export default function AwaSession() {
  const [tab, setTab] = useState<"issue" | "argument">("issue");
  const [showLegacyArg, setShowLegacyArg] = useState(false);
  const [prompt, setPrompt] = useState<AwaPrompt | null>(null);
  const [essay, setEssay] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [checklist, setChecklist] = useState<boolean[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [showBrainstorm, setShowBrainstorm] = useState(false);
  const [showSampleEssay, setShowSampleEssay] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const [aiEndpoint, setAiEndpoint] = useState("https://api.openai.com/v1/chat/completions");
  const [aiModel, setAiModel] = useState("gpt-4o-mini");
  const [aiKey, setAiKey] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiSetup, setShowAiSetup] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    const savedHist = loadHistory();
    setHistory(savedHist);
    if (typeof localStorage !== "undefined") {
      try {
        const cfg = JSON.parse(localStorage.getItem(AI_KEY) || "{}");
        if (cfg.endpoint) setAiEndpoint(cfg.endpoint);
        if (cfg.model) setAiModel(cfg.model);
        if (cfg.apiKey) setAiKey(cfg.apiKey);
      } catch {
        // ignore
      }
    }
    // Load an initial Issue prompt immediately so the user can start writing in 0 extra clicks
    const enriched = ISSUE.filter((p) => p.brainstorm && p.brainstorm.length > 0);
    const pool = enriched.length > 0 ? enriched : ISSUE;
    const unseen = pool.filter((p) => !savedHist.includes(p.id));
    setPrompt(pick(unseen.length > 0 ? unseen : pool));
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  function saveAiConfig() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        AI_KEY,
        JSON.stringify({ endpoint: aiEndpoint, model: aiModel, apiKey: aiKey })
      );
    }
    setShowAiSetup(false);
  }

  function fmt(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function nextPrompt(onlyWithBrainstorm = false) {
    let pool = tab === "issue" ? ISSUE : ARGUMENT;
    if (onlyWithBrainstorm && tab === "issue") {
      const enriched = pool.filter((p) => p.brainstorm && p.brainstorm.length > 0);
      if (enriched.length > 0) pool = enriched;
    }
    const unseen = pool.filter((p) => !history.includes(p.id));
    const chosen = pick(unseen.length > 0 ? unseen : pool);
    setPrompt(chosen);
    setEssay("");
    setSubmitted(false);
    setChecklist([]);
    setAiFeedback("");
    setShowBrainstorm(false);
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
      const wc = essay.trim() ? essay.trim().split(/\s+/).length : 0;
      postGreResult({
        kind: "writing",
        id: `gre-awa-${prompt.id}-${Date.now()}`,
        taskType: tab === "issue" ? "gre_issue" : "gre_argument",
        promptTitle: prompt.id,
        promptText: prompt.prompt,
        responseText: essay,
        wordCount: wc,
        elapsedSec: elapsed,
      });
    }
  }

  function buildFullDiagnosticPrompt(): string {
    return `${awaGuides.ai_diagnostic_prompt}\n\nPROMPT:\n${prompt?.prompt || ""}\n\nDIRECTIONS:\n${prompt?.directions || ""}\n\nSTUDENT ESSAY (${wordCount} words, ${fmt(elapsed)}):\n${essay}`;
  }

  async function runAiGrade() {
    if (!aiKey.trim()) {
      setShowAiSetup(true);
      return;
    }
    setAiLoading(true);
    setAiFeedback("");
    try {
      const res = await fetch(aiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiKey.trim()}`,
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: "system", content: awaGuides.ai_diagnostic_prompt },
            {
              role: "user",
              content: `PROMPT:\n${prompt?.prompt}\n\nDIRECTIONS:\n${prompt?.directions}\n\nSTUDENT ESSAY (${wordCount} words):\n${essay}`,
            },
          ],
          temperature: 0.3,
        }),
      });
      if (!res.ok) {
        const errTxt = await res.text();
        setAiFeedback(`API Error (${res.status}): ${errTxt.slice(0, 300)}`);
      } else {
        const data = await res.json();
        setAiFeedback(data?.choices?.[0]?.message?.content || JSON.stringify(data));
      }
    } catch (e: any) {
      setAiFeedback(`Network or CORS error: ${e?.message || String(e)}. Use "Copy essay feedback prompt" to paste into ChatGPT, Claude, or Gemini.`);
    } finally {
      setAiLoading(false);
    }
  }

  function copyDiagnosticPrompt() {
    navigator.clipboard?.writeText(buildFullDiagnosticPrompt());
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  }

  function toggleCheck(i: number) {
    setChecklist((c) => c.map((v, idx) => (idx === i ? !v : v)));
  }

  const rubric = tab === "issue" ? ISSUE_RUBRIC : ARGUMENT_RUBRIC;
  const score = submitted ? Math.round(((checklist.filter(Boolean).length / rubric.length) * 6) * 2) / 2 : null;
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const wordPct = Math.min(100, Math.round((wordCount / 450) * 100));

  return (
    <main className="container-narrow">
      <div className="dash-header" style={{ marginBottom: "1rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Essay Writing</h1>
          <p className="muted-text" style={{ margin: "0.2rem 0 0" }}>
            Issue Essay · 30 min · Aim for 400-550 words
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" className="btn-ghost" onClick={() => setShowTemplates((s) => !s)}>
            {showTemplates ? "Hide Guide" : "Scoring Guide"}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setShowAiSetup((s) => !s)}>
            {aiKey ? "AI Ready" : "AI Feedback Setup"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              const next = !showLegacyArg;
              setShowLegacyArg(next);
              const nextTab = next ? "argument" : "issue";
              setTab(nextTab);
              setPrompt(pick(nextTab === "issue" ? ISSUE : ARGUMENT));
              setSubmitted(false);
              setEssay("");
              setRunning(false);
              setElapsed(0);
            }}
          >
            {showLegacyArg ? "Switch to Issue" : "Old Argument Prompts"}
          </button>
        </div>
      </div>

      {showAiSetup && (
        <section className="surface-card">
          <h2>AI Essay Feedback Setup</h2>
          <p className="muted-text" style={{ marginTop: 0 }}>
            Saved only on your computer. Works with OpenAI-compatible API keys.
          </p>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <label htmlFor="awa-ai-endpoint" className="field-label">
              API Endpoint URL
              <input id="awa-ai-endpoint" className="field-input" value={aiEndpoint} onChange={(e) => setAiEndpoint(e.target.value)} />
            </label>
            <label htmlFor="awa-ai-model" className="field-label">
              Model Name
              <input id="awa-ai-model" className="field-input" value={aiModel} onChange={(e) => setAiModel(e.target.value)} />
            </label>
            <label htmlFor="awa-ai-key" className="field-label">
              API Key (stored locally)
              <input id="awa-ai-key" type="password" className="field-input" value={aiKey} onChange={(e) => setAiKey(e.target.value)} placeholder="sk-..." />
            </label>
            <div>
              <button type="button" className="button" onClick={saveAiConfig}>Save Local Settings</button>
            </div>
          </div>
        </section>
      )}

      {showTemplates && (
        <section className="surface-card">
          <h2>Issue Essay Toolkit &amp; Scoring Guide</h2>
          <p className="muted-text" style={{ marginTop: 0 }}>
            30-minute execution budget: <strong>0-4 min</strong> outline (qualified stance + 2 reasons/examples + 1 concession) · <strong>4-26 min</strong> draft 5 clear paragraphs (400-550 words) · <strong>26-30 min</strong> e-rater mechanics proofread.
          </p>

          <div style={{ display: "grid", gap: "0.5rem", marginBottom: "0.9rem", fontSize: "0.9rem" }}>
            {awaGuides.rubric_criteria.map((rc) => (
              <div key={rc.band}>
                <strong>Band {rc.band}:</strong> {rc.summary}
              </div>
            ))}
          </div>

          <details open style={{ marginTop: "0.5rem" }}>
            <summary style={{ fontWeight: 700, padding: "0.4rem 0", minHeight: 44, display: "flex", alignItems: "center" }}>
              Natural Essay Blueprint &amp; Reusable Frames (Adapt, Never Copy Blindly)
            </summary>
            <div className="explanation" style={{ display: "grid", gap: "0.6rem" }}>
              <div><strong>1. Nuanced Opening &amp; Thesis:</strong> &quot;While [opposing concern] holds real merit in [narrow context], [your core position] remains more persuasive because [reason 1] and [reason 2].&quot;</div>
              <div><strong>2. Body 1 &amp; 2 (Claim -&gt; Mechanism -&gt; Concrete Example):</strong> &quot;First, [clear claim]. This occurs because [causal mechanism]. Consider [named historical, scientific, or policy case], which demonstrates that [tie back to thesis].&quot;</div>
              <div><strong>3. Body 3 (Fair Concession + Rebuttal):</strong> &quot;Admittedly, [strongest counterargument], particularly when [specific boundary]. Yet this caveat does not overturn [your thesis], because [why primary mechanism outweighs it].&quot;</div>
              <div><strong>4. Synthesis Conclusion:</strong> &quot;Ultimately, although [brief nod to complexity], prioritizing [your stance] offers a stronger path forward because [synthesized takeaway].&quot;</div>
            </div>
          </details>

          <details style={{ marginTop: "0.5rem" }}>
            <summary style={{ fontWeight: 700, padding: "0.4rem 0", minHeight: 44, display: "flex", alignItems: "center" }}>
              Final 4-Minute e-rater Proofread &amp; High-Risk Traps
            </summary>
            <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.25rem", lineHeight: 1.65, fontSize: "0.9rem" }}>
              <li><strong>No comma splices:</strong> Use <code>; however,</code> or <code>. However,</code> instead of <code>, however,</code> between two full clauses.</li>
              <li><strong>Active verbs over weak fillers:</strong> Write <em>experienced</em>, <em>demonstrated</em>, or <em>argued</em> instead of <em>had some experiences</em> or <em>made an argument</em>.</li>
              <li><strong>One syntactic upgrade max:</strong> e.g., <em>Not only does [X] improve [A], but it also strengthens [B].</em></li>
              <li><strong>Spelling/usage checks (no spellchecker on exam):</strong> <em>affect/effect</em>, <em>complement/compliment</em>, <em>allude/elude</em>, <em>accommodate</em>, <em>committee</em>, <em>necessary</em>, <em>definitely</em>, <em>separate</em>, <em>a lot</em> (two words).</li>
            </ul>
          </details>
        </section>
      )}

      <div className="exam-target-bar" aria-label="Exam task target">
        <div>
          <span className="exam-target-tag">
            {tab === "issue"
              ? "Exam target: GRE Analytical Writing (Section 1) - Analyze an Issue"
              : "Exam target: Optional critical-reasoning drill (retired Argument format)"}
          </span>
          <p className="exam-target-detail">
            {tab === "issue"
              ? "Official post-2023 GRE opens with one 30-minute Analyze an Issue essay (scored 0.0-6.0 in 0.5 steps; aim for 400-550 words)."
              : "No longer tested on the Shortened GRE; useful as extra practice for spotting flawed assumptions in Reading Comprehension."}
          </p>
        </div>
      </div>

      {!prompt ? (
        <section className="surface-card">
          <h2>{tab === "issue" ? "Analyze an Issue · 30 minutes" : "Analyze an Argument · extra practice"}</h2>
          <p className="muted-text">
            {tab === "issue"
              ? "State a clear position, develop two concrete reasons with real-world examples, address a counterargument, and finish with a crisp conclusion."
              : "This optional exercise is outside the current GRE format."}
          </p>
          <p className="muted-text">
            Completed in this browser: <strong>{history.filter((id) => id.startsWith(tab === "issue" ? "awa_issue" : "awa_arg")).length}</strong> / {tab === "issue" ? ISSUE.length : ARGUMENT.length}
          </p>
          <div className="tab-row" style={{ marginBottom: 0 }}>
            <button type="button" className="button" onClick={() => nextPrompt(false)}>Random Prompt</button>
            {tab === "issue" && (
              <button type="button" className="btn-accent" onClick={() => nextPrompt(true)}>
                Prompt With Brainstorming Guide ({awaGuides.matched_prompts})
              </button>
            )}
          </div>
        </section>
      ) : !submitted ? (
        <section className="surface-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span className="qtype-label" style={{ margin: 0 }}>
              {tab === "issue" ? "Issue Task (30 Min)" : "Legacy Argument Task"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span className={`pacing-pill font-mono ${elapsed > 1800 ? "over" : ""}`}>
                {fmt(elapsed)} / 30:00 {elapsed > 1800 ? "(Over)" : ""}
              </span>
              <button type="button" className="btn-ghost study-timer-mini" onClick={() => setRunning((r) => !r)}>
                {running ? "Pause" : elapsed > 0 ? "Resume" : "Start timer"}
              </button>
              {elapsed > 0 && (
                <button type="button" className="btn-ghost study-timer-mini" onClick={() => { setRunning(false); setElapsed(0); }}>
                  Reset
                </button>
              )}
            </div>
          </div>

          <p className="passage" style={{ fontStyle: "italic", margin: "0 0 0.75rem" }}>{prompt.prompt}</p>
          {prompt.directions && <p className="passage-text">{prompt.directions}</p>}

          {(prompt.brainstorm?.length || SAMPLE_ESSAYS[prompt.id]) && (
            <div style={{ margin: "0.75rem 0", display: "grid", gap: "0.65rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {prompt.brainstorm && prompt.brainstorm.length > 0 && (
                  <button type="button" className="btn-ghost" onClick={() => setShowBrainstorm((b) => !b)}>
                    {showBrainstorm ? "Hide Brainstorming Outline" : `Show Brainstorming Outline (${prompt.brainstorm.length} ideas)`}
                  </button>
                )}
                {SAMPLE_ESSAYS[prompt.id] && (
                  <button type="button" className="btn-ghost" onClick={() => setShowSampleEssay((s) => !s)}>
                    {showSampleEssay ? "Hide Sample Essay" : `Show Sample Essay (${SAMPLE_ESSAYS[prompt.id].wordCount} words)`}
                  </button>
                )}
              </div>
              {showBrainstorm && prompt.brainstorm && (
                <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.6, fontSize: "0.92rem" }}>
                  {prompt.brainstorm.map((pt, i) => (
                    <li key={i} style={{ marginBottom: "0.4rem" }}>{pt}</li>
                  ))}
                </ul>
              )}
              {showSampleEssay && SAMPLE_ESSAYS[prompt.id] && (
                <div className="explanation" style={{ whiteSpace: "pre-line", maxHeight: 360, overflowY: "auto" }}>
                  <strong>Sample Issue Essay ({SAMPLE_ESSAYS[prompt.id].wordCount} words):</strong>
                  <p style={{ marginTop: "0.5rem", marginBottom: 0 }}>{SAMPLE_ESSAYS[prompt.id].essay}</p>
                </div>
              )}
            </div>
          )}

          <label htmlFor="awa-essay-editor" className="field-label" style={{ marginTop: "1rem" }}>
            Your Essay Response
            <textarea
              id="awa-essay-editor"
              className="field-textarea"
              value={essay}
              onChange={(e) => {
                const next = e.target.value;
                setEssay(next);
                if (!running && elapsed === 0 && next.trim().length > 0) setRunning(true);
              }}
              placeholder="Write your essay here (target: 400 to 550 words)..."
            />
          </label>

          <div className="word-progress-track" aria-label={`Word count progress: ${wordCount} of 450 target words`}>
            <div className={`word-progress-fill ${wordCount >= 400 ? "target-met" : ""}`} style={{ width: `${wordPct}%` }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.5rem" }}>
            <span className="muted-text font-mono">
              {wordCount} words {wordCount >= 400 ? "(Target length reached)" : "(Target: 400+ words)"}
            </span>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="button" className="btn-ghost" onClick={() => nextPrompt(false)}>New Prompt</button>
              <button type="button" className="button" onClick={handleSubmit} disabled={wordCount < 50}>
                Submit &amp; Grade
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="surface-card">
          <h2>Review Your Essay</h2>
          <p className="muted-text">
            Time: {fmt(elapsed)} | Length: {wordCount} words
          </p>

          <div className="tab-row">
            <button type="button" className="btn-accent" onClick={runAiGrade} disabled={aiLoading}>
              {aiLoading ? "Checking..." : "Get AI Feedback"}
            </button>
            <button type="button" className="btn-ghost" onClick={copyDiagnosticPrompt}>
              {copiedPrompt ? "Copied" : "Copy Prompt for ChatGPT / Claude"}
            </button>
          </div>

          {aiFeedback && (
            <pre className="explanation" style={{ whiteSpace: "pre-wrap", marginBottom: "1rem" }}>
              {aiFeedback}
            </pre>
          )}

          <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0" }}>
            {rubric.map((item, i) => (
              <li key={i} style={{ borderBottom: "1px solid var(--border)", padding: "0.55rem 0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.65rem", fontSize: "0.94rem" }}>
                  <input
                    type="checkbox"
                    checked={checklist[i] || false}
                    onChange={() => toggleCheck(i)}
                    style={{ width: 20, height: 20 }}
                  />
                  <span>{item}</span>
                </label>
              </li>
            ))}
          </ul>

          {score !== null && (
            <div className="feedback correct">
              <strong>Self-Estimated Band: {score.toFixed(1)} / 6.0</strong> ({checklist.filter(Boolean).length} of {rubric.length} criteria checked)
            </div>
          )}

          {prompt.brainstorm && prompt.brainstorm.length > 0 && (
            <div className="explanation" style={{ marginTop: "1rem" }}>
              <strong>Reference Brainstorming Points:</strong>
              <ul style={{ marginTop: "0.45rem", paddingLeft: "1.2rem" }}>
                {prompt.brainstorm.map((pt, i) => (
                  <li key={i} style={{ marginBottom: "0.35rem" }}>{pt}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: "1.25rem" }}>
            <button type="button" className="button" onClick={() => nextPrompt(false)}>Next Prompt</button>
          </div>
        </section>
      )}
    </main>
  );
}
