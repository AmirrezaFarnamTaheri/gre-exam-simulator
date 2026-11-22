"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import coursesData from "../../data/courses/gre_courses.json";
import { getCourseTrackExamTarget } from "@/lib/examTargets";

interface QuizItem {
  q: string;
  choices: string[];
  answer: string;
  explanation: string;
}

interface CourseLesson {
  id: string;
  track: string;
  title: string;
  duration: string;
  summary: string;
  keyRules: string[];
  workedExample: { problem: string; walkthrough: string };
  practiceAction: { label: string; href: string };
  quiz: QuizItem[];
}

const LESSONS = coursesData as CourseLesson[];
const DONE_KEY = "gre-courses-done-v1";

export default function CoursesHub() {
  const tracks = useMemo(() => ["All", ...Array.from(new Set(LESSONS.map((l) => l.track)))], []);
  const [selectedTrack, setSelectedTrack] = useState("All");
  const [activeId, setActiveId] = useState(LESSONS[0]?.id || "");
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DONE_KEY) || "{}");
      if (saved && typeof saved === "object") setDoneMap(saved);
    } catch {
      // ignore
    }
  }, []);

  const filtered = selectedTrack === "All" ? LESSONS : LESSONS.filter((l) => l.track === selectedTrack);
  const active = filtered.find((l) => l.id === activeId) || filtered[0] || LESSONS[0];
  const doneCount = LESSONS.filter((l) => doneMap[l.id]).length;
  const pct = Math.round((doneCount / Math.max(1, LESSONS.length)) * 100);

  function toggleDone(id: string) {
    const next = { ...doneMap, [id]: !doneMap[id] };
    setDoneMap(next);
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  return (
    <main className="container">
      <div className="dash-header" style={{ marginBottom: "1rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Courses &amp; Lessons</h1>
          <p className="muted-text" style={{ margin: "0.2rem 0 0" }}>
            {doneCount} of {LESSONS.length} lessons completed ({pct}%)
          </p>
        </div>
        <div className="tab-row" role="tablist" aria-label="Course tracks" style={{ margin: 0 }}>
          {tracks.map((tr) => (
            <button
              key={tr}
              type="button"
              role="tab"
              aria-selected={selectedTrack === tr}
              className={`tab-btn ${selectedTrack === tr ? "active" : ""}`}
              onClick={() => {
                setSelectedTrack(tr);
                const firstInTrack = (tr === "All" ? LESSONS : LESSONS.filter((l) => l.track === tr))[0];
                if (firstInTrack) setActiveId(firstInTrack.id);
              }}
            >
              {tr}
            </button>
          ))}
        </div>
      </div>

      <div className="word-progress-track" style={{ marginBottom: "1.25rem" }}>
        <div className={`word-progress-fill ${pct === 100 ? "target-met" : ""}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="course-layout">
        <aside className="surface-card course-sidebar" style={{ marginBottom: 0 }}>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Lesson Plan</h2>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            {filtered.map((lesson, idx) => {
              const isActive = active && lesson.id === active.id;
              const isDone = !!doneMap[lesson.id];
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setActiveId(lesson.id)}
                  className={`course-nav-item ${isActive ? "active" : ""}`}
                >
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                    {idx + 1}. {lesson.title}
                  </span>
                  <span className="muted-text" style={{ fontSize: "0.78rem" }}>
                    {lesson.track} · {lesson.duration} {isDone ? "· Done" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {active && (
          <article className="surface-card" style={{ marginBottom: 0 }}>
            <div className="dash-header" style={{ marginBottom: "0.75rem" }}>
              <div>
                <p className="qtype-label" style={{ marginBottom: "0.25rem" }}>
                  {active.track} · {active.duration}
                </p>
                <h2 style={{ margin: 0 }}>{active.title}</h2>
              </div>
              <button
                type="button"
                className={doneMap[active.id] ? "btn-accent" : "btn-ghost"}
                onClick={() => toggleDone(active.id)}
              >
                {doneMap[active.id] ? "Completed" : "Mark Complete"}
              </button>
            </div>

            <p className="muted-text" style={{ marginTop: 0 }}>{active.summary}</p>
            <div className="exam-target-bar" aria-label="Exam task target">
              <div>
                <span className="exam-target-tag">{getCourseTrackExamTarget(active.track)}</span>
              </div>
            </div>

            <h3>Key Rules</h3>
            <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.7 }}>
              {active.keyRules.map((rule, i) => (
                <li key={i} style={{ marginBottom: "0.4rem" }}>{rule}</li>
              ))}
            </ul>

            <div className="explanation" style={{ marginTop: "1rem" }}>
              <strong>Worked Example:</strong>
              <p style={{ margin: "0.35rem 0" }}>{active.workedExample.problem}</p>
              <p style={{ margin: 0 }}><strong>Walkthrough:</strong> {active.workedExample.walkthrough}</p>
            </div>

            <div style={{ marginTop: "1.25rem" }}>
              <h3>Quick Check</h3>
              <div style={{ display: "grid", gap: "1rem" }}>
                {active.quiz.map((item, qi) => {
                  const qKey = `${active.id}:${qi}`;
                  const picked = quizAnswers[qKey];
                  const answered = Boolean(picked);
                  return (
                    <div key={qKey} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.9rem" }}>
                      <p style={{ margin: "0 0 0.65rem", fontWeight: 600 }}>{qi + 1}. {item.q}</p>
                      <div className="choices" style={{ margin: 0 }}>
                        {item.choices.map((ch) => {
                          const isPicked = picked === ch;
                          const isRight = answered && ch === item.answer;
                          const isWrong = answered && isPicked && ch !== item.answer;
                          return (
                            <button
                              key={ch}
                              type="button"
                              onClick={() => setQuizAnswers((prev) => ({ ...prev, [qKey]: ch }))}
                              className={`choice ${isPicked ? "selected" : ""} ${isRight ? "correct" : ""} ${isWrong ? "incorrect" : ""}`}
                            >
                              {ch}
                            </button>
                          );
                        })}
                      </div>
                      {answered && (
                        <p className="muted-text" style={{ margin: "0.6rem 0 0", fontSize: "0.88rem" }}>
                          <strong>{picked === item.answer ? "Correct:" : "Explanation:"}</strong> {item.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <Link href={active.practiceAction.href} className="button">
                {active.practiceAction.label} &rarr;
              </Link>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  const idx = filtered.findIndex((l) => l.id === active.id);
                  const next = filtered[(idx + 1) % filtered.length];
                  if (next) setActiveId(next.id);
                }}
              >
                Next Lesson
              </button>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
