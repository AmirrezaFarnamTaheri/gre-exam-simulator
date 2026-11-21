"use client";

import { useState } from "react";
import type { DataInterpretationDataset, DataInterpretationQuestion } from "gre-adaptive-engine";
import { getDiDatasetById } from "@/lib/questionBank";

export function DiDataCard({ dataset }: { dataset: DataInterpretationDataset }) {
  // Compute max numeric value in column 1 for optional horizontal bar visualization
  const numericCol1 = dataset.rows.map((r) => (typeof r[1] === "number" ? r[1] : Number(r[1]) || 0));
  const maxVal = Math.max(1, ...numericCol1);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "1rem", backgroundColor: "#f8fafc", color: "#0f172a" }}>
      <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 700 }}>{dataset.title}</h3>
      {dataset.subtitle && (
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "#475569" }}>{dataset.subtitle}</p>
      )}

      {dataset.chartType === "bar" && (
        <div style={{ marginBottom: "0.85rem", display: "grid", gap: "0.4rem" }}>
          {dataset.rows.map((row, idx) => {
            const val = numericCol1[idx];
            const pct = Math.round((val / maxVal) * 100);
            return (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "92px 1fr 56px", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" }}>
                <span style={{ fontWeight: 600 }}>{String(row[0])}</span>
                <div style={{ backgroundColor: "#e2e8f0", borderRadius: 4, height: 14, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "#1b3a5b" }} />
                </div>
                <span style={{ fontFamily: "monospace", textAlign: "right" }}>
                  {val}
                  {dataset.unit === "%" ? "%" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", backgroundColor: "#fff" }}>
          <thead>
            <tr style={{ backgroundColor: "#e2e8f0" }}>
              {dataset.headers.map((h, i) => (
                <th key={i} style={{ padding: "0.45rem 0.6rem", border: "1px solid #cbd5e1", color: "#0f172a", textAlign: i === 0 ? "left" : "right" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    style={{
                      padding: "0.4rem 0.6rem",
                      border: "1px solid #cbd5e1",
                      textAlign: cIdx === 0 ? "left" : "right",
                      fontWeight: cIdx === 0 ? 600 : 400,
                      fontFamily: cIdx === 0 ? "inherit" : "monospace",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dataset.notes && (
        <p style={{ margin: "0.6rem 0 0", fontSize: "0.78rem", color: "#475569", fontStyle: "italic" }}>
          Note: {dataset.notes}
        </p>
      )}
    </div>
  );
}

export default function DataInterpretationQuestionView({
  question,
  onAnswered,
}: {
  question: DataInterpretationQuestion;
  onAnswered: (correct: boolean) => void;
}) {
  const dataset = getDiDatasetById(question.dataset_id);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function toggle(choice: string) {
    if (submitted) return;
    if (question.select_all) {
      setSelected((prev) => (prev.includes(choice) ? prev.filter((c) => c !== choice) : [...prev, choice]));
    } else {
      setSelected([choice]);
    }
  }

  function handleSubmit() {
    if (submitted || selected.length === 0) return;
    const isCorrect =
      selected.length === question.correct.length &&
      selected.every((v) => question.correct.includes(v));
    setSubmitted(true);
    onAnswered(isCorrect);
  }

  return (
    <article className="question-card">
      <p className="qtype-label">
        Data Interpretation {question.select_all ? "· Select All That Apply" : "· Single Choice"}
      </p>
      <DiDataCard dataset={dataset} />
      <p className="prompt" style={{ marginTop: "1rem" }}>{question.prompt}</p>
      <div className="choices">
        {question.choices.map((c) => {
          const isPicked = selected.includes(c);
          const isRight = submitted && question.correct.includes(c);
          const isWrong = submitted && isPicked && !question.correct.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              className={`choice ${isPicked ? "selected" : ""} ${isRight ? "correct" : ""} ${isWrong ? "incorrect" : ""}`}
            >
              {c}
            </button>
          );
        })}
      </div>
      {!submitted ? (
        <button className="button" onClick={handleSubmit} disabled={selected.length === 0}>
          Submit
        </button>
      ) : (
        <div className="explanation">
          <strong>Explanation:</strong> {question.explanation}
        </div>
      )}
    </article>
  );
}
