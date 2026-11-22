"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { exportState, getTopicSummary, importState, type Section } from "gre-adaptive-engine";
import { useAdaptiveState } from "@/lib/useAdaptiveState";

type Desk = "home" | "practice" | "tests" | "learn" | "progress";

type ProgressCatalog = { questionIds: string[]; topics: Record<Section, string[]> };

type Destination = [href: string, title: string, detail: string];

const practice: Destination[] = [
  ["/study/quant", "Math", "Arithmetic, algebra, geometry, and data"],
  ["/study/verbal", "Verbal", "Reading comprehension, text completion, and sentence equivalence"],
  ["/awa", "Essay writing", "Plan or write an Analyze an Issue essay"],
  ["/vocab", "Vocabulary", "Flashcards and synonym practice"],
  ["/study/quant?level=beginner", "Math foundations", "Start with ratios, rates, equations, and right triangles"],
  ["/study/mixed", "Mixed questions", "Questions from both verbal and math"],
];

const tests: Destination[] = [
  ["/exam/quant-s1", "Short math test", "12 questions · 21 minutes"],
  ["/exam/verbal-s1", "Short verbal test", "12 questions · 18 minutes"],
  ["/exam/quant", "Math test", "27 questions · 47 minutes"],
  ["/exam/verbal", "Verbal test", "27 questions · 41 minutes"],
];

const resources: Destination[] = [
  ["/courses", "Lessons", "Study a worked example and check your understanding"],
  ["/guides", "Reference guides", "Formulas, reading strategies, and essay guidance"],
  ["https://www.ets.org/gre/test-takers/general-test/prepare/test-structure.html", "Official GRE format", "Check section timing and question counts with ETS"],
];

const headings: Record<Desk, string> = {
  home: "GRE study desk",
  practice: "Untimed practice",
  tests: "Timed tests",
  learn: "Lessons and guides",
  progress: "Your progress",
};

export default function Dashboard({ desk = "home", catalog }: { desk?: Desk; catalog?: ProgressCatalog }) {
  const { state, hydrated, replaceState } = useAdaptiveState();
  const input = useRef<HTMLInputElement>(null);
  const [backupMessage, setBackupMessage] = useState("");

  const latest = new Map<string, boolean>();
  for (const attempt of state.attempts) latest.set(attempt.questionId, attempt.correct);
  const mistakes = catalog?.questionIds.reduce((total, id) => total + Number(latest.get(id) === false), 0) ?? 0;

  function saveBackup() {
    const url = URL.createObjectURL(new Blob([exportState(state)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "gre-study-progress.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const field = event.currentTarget;
    const file = field.files?.[0];
    if (!file) return;
    field.value = "";
    if (!window.confirm("Replace the progress saved in this browser with this backup?")) return;
    try {
      replaceState(importState(await file.text()));
      setBackupMessage("Backup restored.");
    } catch {
      setBackupMessage("Choose a backup exported from this GRE app.");
    }
  }

  return (
    <main className="container gre-desk">
      {desk === "home" ? (
        <>
          <header className="desk-hero">
            <div>
              <h1>{headings.home}</h1>
              <p>Work through a few questions or sit a timed test.</p>
              <Link className="button" href="/study/mixed">Start practice</Link>
            </div>
            <aside className="desk-ledger" aria-label="Practice activity">
              <strong>{hydrated ? state.attempts.length : "–"}</strong>
              <span>Answers recorded</span>
              <Link href="/progress">See your progress <span aria-hidden="true">→</span></Link>
            </aside>
          </header>
          <div className="desk-columns">
            <section aria-labelledby="choose-practice">
              <h2 id="choose-practice">Practice by subject</h2>
              <DestinationList items={practice.slice(0, 4)} />
            </section>
            <section className="desk-side" aria-labelledby="prepare-test">
              <h2 id="prepare-test">Prepare for test day</h2>
              <DestinationList items={[
                ["/tests", "Timed tests", "Full test or a shorter section"],
                ["/learn", "Lessons and guides", "Worked examples and reference material"],
                ["/study/mistakes", "Retry missed questions", "Work through questions you missed"],
              ]} />
            </section>
          </div>
        </>
      ) : (
        <>
          <header className="desk-heading"><h1>{headings[desk]}</h1></header>
          {desk === "practice" && <DestinationList items={practice} />}
          {desk === "learn" && <DestinationList items={resources} />}
          {desk === "tests" && (
            <>
              <section className="desk-feature">
                <div><h2>Full practice test</h2><p>One essay and four timed sections · 1 hour 58 minutes</p></div>
                <Link href="/exam/full" className="button">Open full test</Link>
              </section>
              <h2 className="desk-subheading">Section tests</h2>
              <DestinationList items={tests} />
            </>
          )}
          {desk === "progress" && (
            <>
              <section className="desk-feature">
                <div><h2>Missed questions</h2><p>{hydrated ? `${mistakes} to retry · ${state.attempts.length} answers recorded` : "Loading progress…"}</p></div>
                <Link href="/study/mistakes" className="button">Review mistakes</Link>
              </section>
              {catalog && hydrated && state.attempts.length > 0 && (
                <div className="topics-grid desk-topics">
                  <TopicTable title="Verbal" section="verbal" rows={getTopicSummary(state, catalog.topics.verbal)} />
                  <TopicTable title="Math" section="quant" rows={getTopicSummary(state, catalog.topics.quant)} />
                </div>
              )}
              <details className="desk-backup">
                <summary>Back up progress</summary>
                <p>Save a copy of your progress or restore it in this browser.</p>
                <div className="backup-actions">
                  <button type="button" className="btn-ghost" disabled={!hydrated} onClick={saveBackup}>Download backup</button>
                  <button type="button" className="btn-ghost" disabled={!hydrated} onClick={() => input.current?.click()}>Restore backup</button>
                  <input ref={input} type="file" accept=".json,application/json" hidden onChange={restoreBackup} />
                </div>
                <p role="status">{backupMessage}</p>
              </details>
            </>
          )}
        </>
      )}
    </main>
  );
}

function DestinationList({ items }: { items: Destination[] }) {
  return (
    <ul className="desk-list">
      {items.map(([href, title, detail]) => {
        const external = /^https?:\/\//.test(href);
        const content = (
          <>
            <span><strong>{title}</strong><small>{detail}</small></span>
            <span className="desk-arrow" aria-hidden="true">→</span>
          </>
        );
        return (
          <li key={href}>
            {external ? (
              <a className="desk-link" href={href} target="_blank" rel="noopener noreferrer">
                {content}
              </a>
            ) : (
              <Link className="desk-link" href={href}>
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function TopicTable({ title, section, rows }: { title: string; section: "verbal" | "quant"; rows: ReturnType<typeof getTopicSummary> }) {
  return (
    <section className="topic-table">
      <h2>{title}</h2>
      <table>
        <thead><tr><th scope="col">Topic</th><th scope="col">Accuracy</th><th scope="col">Answers</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.topic}>
              <th scope="row" className="capitalize"><Link href={{ pathname: `/study/${section}`, query: { topic: row.topic } }}>{row.topic.replace(/_/g, " ")}</Link></th>
              <td>{row.accuracy === null ? "New" : `${Math.round(row.accuracy * 100)}%`}</td>
              <td>{row.attempts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

