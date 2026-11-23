import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_DB_PATH = process.env.STUDY_RESULTS_DB
  ? path.resolve(process.env.STUDY_RESULTS_DB)
  : path.resolve(process.cwd(), "..", "..", "study_results.sqlite");

type SqliteDb = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...args: unknown[]) => unknown;
    get: (...args: unknown[]) => Record<string, unknown> | undefined;
    all: (...args: unknown[]) => Array<Record<string, unknown>>;
  };
};

let dbInstance: SqliteDb | null = null;

function getDb(): SqliteDb {
  if (dbInstance) return dbInstance;
  fs.mkdirSync(path.dirname(DEFAULT_DB_PATH), { recursive: true });
  // Load Node's built-in node:sqlite at runtime so Next/Webpack does not try to bundle it
  const dynamicRequire = eval("require") as (id: string) => { DatabaseSync: new (p: string) => SqliteDb };
  const { DatabaseSync } = dynamicRequire("node:sqlite");
  const db = new DatabaseSync(DEFAULT_DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS exam_runs (
      id TEXT PRIMARY KEY,
      app TEXT NOT NULL,
      run_type TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      scores_json TEXT NOT NULL,
      details_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS writing_submissions (
      id TEXT PRIMARY KEY,
      app TEXT NOT NULL,
      task_type TEXT NOT NULL,
      run_id TEXT,
      created_at TEXT NOT NULL,
      prompt_title TEXT,
      prompt_text TEXT,
      response_text TEXT NOT NULL,
      word_count INTEGER NOT NULL,
      elapsed_sec INTEGER,
      self_score REAL,
      ai_feedback TEXT
    );

    CREATE TABLE IF NOT EXISTS speaking_attempts (
      id TEXT PRIMARY KEY,
      app TEXT NOT NULL DEFAULT 'toefl',
      task_type TEXT NOT NULL,
      run_id TEXT,
      created_at TEXT NOT NULL,
      prompt_text TEXT,
      transcript TEXT,
      score REAL,
      metrics_json TEXT
    );

    CREATE TABLE IF NOT EXISTS practice_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app TEXT NOT NULL,
      section TEXT NOT NULL,
      qtype TEXT NOT NULL,
      topic TEXT,
      question_id TEXT,
      correct INTEGER NOT NULL,
      elapsed_sec INTEGER,
      user_answer TEXT,
      expected_answer TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_exam_runs_app_time ON exam_runs(app, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_writing_app_time ON writing_submissions(app, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_speaking_time ON speaking_attempts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_practice_app_section ON practice_attempts(app, section, created_at DESC);
  `);
  dbInstance = db;
  return db;
}

export async function GET() {
  try {
    const db = getDb();
    const counts = {
      exam_runs: Number(db.prepare("SELECT COUNT(*) AS c FROM exam_runs").get()?.c ?? 0),
      writing_submissions: Number(db.prepare("SELECT COUNT(*) AS c FROM writing_submissions").get()?.c ?? 0),
      speaking_attempts: Number(db.prepare("SELECT COUNT(*) AS c FROM speaking_attempts").get()?.c ?? 0),
      practice_attempts: Number(db.prepare("SELECT COUNT(*) AS c FROM practice_attempts").get()?.c ?? 0),
    };
    const recentRuns = db
      .prepare("SELECT id, app, run_type, title, created_at, scores_json FROM exam_runs ORDER BY created_at DESC LIMIT 20")
      .all();
    return NextResponse.json({ ok: true, dbPath: DEFAULT_DB_PATH, counts, recentRuns });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Database error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const kind = String(body.kind || "practice");
    const db = getDb();
    const now = new Date().toISOString();

    if (kind === "run") {
      const id = String(body.id || `gre-run-${Date.now()}`);
      const runType = String(body.runType || "diagnostic");
      const title = String(body.title || "GRE Practice Test");
      const createdAt = String(body.createdAt || now);
      db.prepare(`
        INSERT INTO exam_runs (id, app, run_type, title, created_at, scores_json, details_json)
        VALUES (?, 'gre', ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          scores_json = excluded.scores_json,
          details_json = excluded.details_json
      `).run(id, runType, title, createdAt, JSON.stringify(body.scores || {}), JSON.stringify(body.details || {}));

      const awa = body.awa as { prompt?: string; essay?: string; wordCount?: number } | undefined;
      if (awa && awa.essay && String(awa.essay).trim()) {
        db.prepare(`
          INSERT INTO writing_submissions (id, app, task_type, run_id, created_at, prompt_title, prompt_text, response_text, word_count, elapsed_sec, self_score, ai_feedback)
          VALUES (?, 'gre', 'gre_issue', ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)
          ON CONFLICT(id) DO UPDATE SET
            response_text = excluded.response_text,
            word_count = excluded.word_count
        `).run(
          `${id}:awa`,
          id,
          createdAt,
          `${title} - Analyze an Issue`,
          awa.prompt || "",
          awa.essay,
          Number(awa.wordCount) || awa.essay.trim().split(/\s+/).length
        );
      }
      return NextResponse.json({ ok: true, id, dbPath: DEFAULT_DB_PATH });
    }

    if (kind === "writing") {
      const id = String(body.id || `gre-awa-${Date.now()}`);
      const text = String(body.responseText || "");
      const wc = Number.isFinite(Number(body.wordCount))
        ? Number(body.wordCount)
        : text.trim()
          ? text.trim().split(/\s+/).length
          : 0;
      db.prepare(`
        INSERT INTO writing_submissions (id, app, task_type, run_id, created_at, prompt_title, prompt_text, response_text, word_count, elapsed_sec, self_score, ai_feedback)
        VALUES (?, 'gre', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          response_text = excluded.response_text,
          word_count = excluded.word_count,
          elapsed_sec = excluded.elapsed_sec,
          self_score = COALESCE(excluded.self_score, writing_submissions.self_score),
          ai_feedback = COALESCE(excluded.ai_feedback, writing_submissions.ai_feedback)
      `).run(
        id,
        String(body.taskType || "gre_issue"),
        body.runId ? String(body.runId) : null,
        String(body.createdAt || now),
        body.promptTitle ? String(body.promptTitle) : "GRE Analyze an Issue",
        body.promptText ? String(body.promptText) : "",
        text,
        wc,
        body.elapsedSec != null ? Number(body.elapsedSec) : null,
        body.selfScore != null ? Number(body.selfScore) : null,
        body.aiFeedback ? String(body.aiFeedback) : null
      );
      return NextResponse.json({ ok: true, id });
    }

    // Default: practice attempt(s)
    const items = Array.isArray(body.items) ? (body.items as Array<Record<string, unknown>>) : [body];
    const stmt = db.prepare(`
      INSERT INTO practice_attempts (app, section, qtype, topic, question_id, correct, elapsed_sec, user_answer, expected_answer, created_at)
      VALUES ('gre', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const it of items) {
      stmt.run(
        String(it.section || "quant"),
        String(it.qtype || "unknown"),
        it.topic ? String(it.topic) : null,
        it.questionId ? String(it.questionId) : null,
        it.correct ? 1 : 0,
        it.elapsedSec != null ? Number(it.elapsedSec) : null,
        it.userAnswer != null ? String(it.userAnswer) : null,
        it.expectedAnswer != null ? String(it.expectedAnswer) : null,
        String(it.createdAt || now)
      );
    }
    return NextResponse.json({ ok: true, count: items.length });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Bad request" },
      { status: 400 }
    );
  }
}
