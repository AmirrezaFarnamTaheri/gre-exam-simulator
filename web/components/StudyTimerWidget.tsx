"use client";

import { useEffect, useRef, useState } from "react";

type TimerMode = "pomodoro" | "countdown" | "stopwatch";
type PomodoroPhase = "focus" | "break";

interface TimerStats {
  date: string;
  focusMinutes: number;
  pomodoros: number;
  goalMinutes: number;
  streakDays: number;
  lastActiveDate: string;
}

const STORAGE_KEY = "gre-study-timer-v1";

const POMODORO_PRESETS = [
  { label: "25 / 5", focus: 25, rest: 5 },
  { label: "50 / 10", focus: 50, rest: 10 },
  { label: "15 / 3", focus: 15, rest: 3 },
];

const SPRINT_PRESETS = [
  { label: "10m Drill", minutes: 10 },
  { label: "18m Verbal S1", minutes: 18 },
  { label: "21m Math S1", minutes: 21 },
  { label: "30m Essay", minutes: 30 },
];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayKey(): string {
  const d = new Date(Date.now() - 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function defaultStats(): TimerStats {
  return {
    date: todayKey(),
    focusMinutes: 0,
    pomodoros: 0,
    goalMinutes: 30,
    streakDays: 0,
    lastActiveDate: "",
  };
}

function loadStats(): TimerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw) as Partial<TimerStats>;
    const today = todayKey();
    if (parsed.date === today) {
      return { ...defaultStats(), ...parsed };
    }
    const keptStreak = parsed.lastActiveDate === yesterdayKey() ? (parsed.streakDays ?? 0) : 0;
    return {
      ...defaultStats(),
      goalMinutes: parsed.goalMinutes ?? 30,
      streakDays: keptStreak,
      lastActiveDate: parsed.lastActiveDate ?? "",
    };
  } catch {
    return defaultStats();
  }
}

function saveStats(stats: TimerStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage errors
  }
}

function fmtClock(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function playGentleChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.46);
  } catch {
    // ignore audio restrictions
  }
}

export default function StudyTimerWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [presetIdx, setPresetIdx] = useState(0);
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [customMinutes, setCustomMinutes] = useState(18);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [muted, setMuted] = useState(false);
  const [notice, setNotice] = useState("");
  const [stats, setStats] = useState<TimerStats>(defaultStats);
  const focusAccumRef = useRef(0);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function addLoggedMinutes(minutes: number, completedPomodoro = false) {
    if (minutes <= 0 && !completedPomodoro) return;
    setStats((prev) => {
      const today = todayKey();
      const base = prev.date === today ? prev : { ...defaultStats(), goalMinutes: prev.goalMinutes, streakDays: prev.lastActiveDate === yesterdayKey() ? prev.streakDays : 0, lastActiveDate: prev.lastActiveDate };
      const isNewActiveDay = base.lastActiveDate !== today;
      const next: TimerStats = {
        ...base,
        date: today,
        focusMinutes: base.focusMinutes + minutes,
        pomodoros: base.pomodoros + (completedPomodoro ? 1 : 0),
        streakDays: isNewActiveDay ? base.streakDays + 1 : Math.max(1, base.streakDays),
        lastActiveDate: today,
      };
      saveStats(next);
      return next;
    });
  }

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (mode === "stopwatch") {
        setSeconds((s) => s + 1);
        focusAccumRef.current += 1;
        if (focusAccumRef.current >= 60) {
          focusAccumRef.current -= 60;
          addLoggedMinutes(1, false);
        }
        return;
      }

      if (mode === "countdown" || (mode === "pomodoro" && phase === "focus")) {
        focusAccumRef.current += 1;
        if (focusAccumRef.current >= 60) {
          focusAccumRef.current -= 60;
          addLoggedMinutes(1, false);
        }
      }

      setSeconds((prev) => {
        if (prev > 1) return prev - 1;
        if (!muted) playGentleChime();
        if (mode === "pomodoro") {
          const preset = POMODORO_PRESETS[presetIdx];
          if (phase === "focus") {
            addLoggedMinutes(0, true);
            setPhase("break");
            setNotice(`Focus block complete. Take a ${preset.rest}-minute break.`);
            setRunning(false);
            return preset.rest * 60;
          }
          setPhase("focus");
          setNotice("Break finished. Ready for your next focus block.");
          setRunning(false);
          return preset.focus * 60;
        }
        setNotice("Sprint timer finished.");
        setRunning(false);
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, mode, phase, presetIdx, muted]);

  function selectMode(nextMode: TimerMode) {
    setRunning(false);
    setNotice("");
    setMode(nextMode);
    if (nextMode === "pomodoro") {
      setPhase("focus");
      setSeconds(POMODORO_PRESETS[presetIdx].focus * 60);
    } else if (nextMode === "countdown") {
      setSeconds(customMinutes * 60);
    } else {
      setSeconds(0);
    }
  }

  function selectPomodoroPreset(idx: number) {
    setRunning(false);
    setNotice("");
    setPresetIdx(idx);
    setPhase("focus");
    setSeconds(POMODORO_PRESETS[idx].focus * 60);
  }

  function selectSprint(minutes: number) {
    setRunning(false);
    setNotice("");
    setMode("countdown");
    setCustomMinutes(minutes);
    setSeconds(minutes * 60);
  }

  function resetCurrent() {
    setRunning(false);
    setNotice("");
    if (mode === "pomodoro") {
      const p = POMODORO_PRESETS[presetIdx];
      setSeconds((phase === "focus" ? p.focus : p.rest) * 60);
    } else if (mode === "countdown") {
      setSeconds(customMinutes * 60);
    } else {
      setSeconds(0);
    }
  }

  function updateGoal(mins: number) {
    setStats((prev) => {
      const next = { ...prev, goalMinutes: mins };
      saveStats(next);
      return next;
    });
  }

  const goalPct = Math.min(100, Math.round((stats.focusMinutes / Math.max(1, stats.goalMinutes)) * 100));
  const pillText = running
    ? `${mode === "pomodoro" ? (phase === "focus" ? "Focus" : "Break") : mode === "countdown" ? "Timer" : "Clock"} ${fmtClock(seconds)}`
    : "Study timer";

  return (
    <div className="study-timer-wrap">
      <button
        type="button"
        className={`btn-ghost study-timer-trigger ${running ? "active" : ""}`}
        aria-expanded={open}
        aria-controls="gre-study-timer-panel"
        onClick={() => setOpen((o) => !o)}
      >
        {pillText}
      </button>

      {open && (
        <section
          id="gre-study-timer-panel"
          className="study-timer-panel"
          role="dialog"
          aria-label="Study timer and focus tools"
        >
          <div className="study-timer-head">
            <strong>Study timer</strong>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button
                type="button"
                className="btn-ghost study-timer-mini"
                onClick={() => setMuted((m) => !m)}
              >
                {muted ? "Sound off" : "Sound on"}
              </button>
              <button
                type="button"
                className="btn-ghost study-timer-mini"
                onClick={() => setOpen(false)}
                aria-label="Close study timer"
              >
                Close
              </button>
            </div>
          </div>

          <div className="study-timer-tabs" role="tablist" aria-label="Timer mode">
            {(["pomodoro", "countdown", "stopwatch"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={`study-timer-tab ${mode === m ? "active" : ""}`}
                onClick={() => selectMode(m)}
              >
                {m === "pomodoro" ? "Pomodoro" : m === "countdown" ? "Sprint" : "Stopwatch"}
              </button>
            ))}
          </div>

          <div className="study-timer-readout" aria-live="off">
            <span className="study-timer-phase">
              {mode === "pomodoro"
                ? phase === "focus" ? "Focus session" : "Short break"
                : mode === "countdown"
                  ? "Countdown sprint"
                  : "Elapsed study time"}
            </span>
            <strong className="font-mono study-timer-clock">{fmtClock(seconds)}</strong>
          </div>

          {notice && <p className="study-timer-notice" role="status">{notice}</p>}

          <div className="study-timer-controls">
            <button
              type="button"
              className="button"
              onClick={() => {
                setNotice("");
                setRunning((r) => !r);
              }}
            >
              {running ? "Pause" : "Start"}
            </button>
            <button type="button" className="btn-ghost" onClick={resetCurrent}>
              Reset
            </button>
            {mode === "pomodoro" && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setRunning(false);
                  const nextPhase: PomodoroPhase = phase === "focus" ? "break" : "focus";
                  setPhase(nextPhase);
                  setSeconds((nextPhase === "focus" ? POMODORO_PRESETS[presetIdx].focus : POMODORO_PRESETS[presetIdx].rest) * 60);
                }}
              >
                {phase === "focus" ? "Switch to break" : "Switch to focus"}
              </button>
            )}
          </div>

          {mode === "pomodoro" && (
            <div className="study-timer-presets" aria-label="Pomodoro intervals">
              {POMODORO_PRESETS.map((p, idx) => (
                <button
                  key={p.label}
                  type="button"
                  className={`study-timer-chip ${presetIdx === idx ? "active" : ""}`}
                  onClick={() => selectPomodoroPreset(idx)}
                >
                  {p.label} min
                </button>
              ))}
            </div>
          )}

          {mode === "countdown" && (
            <div className="study-timer-presets" aria-label="Sprint presets">
              {SPRINT_PRESETS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className={`study-timer-chip ${customMinutes === s.minutes ? "active" : ""}`}
                  onClick={() => selectSprint(s.minutes)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <div className="study-timer-goal">
            <div className="study-timer-goal-row">
              <span>Today: <strong>{stats.focusMinutes} / {stats.goalMinutes} min</strong></span>
              <span>{stats.pomodoros} pomodoros · {stats.streakDays}d streak</span>
            </div>
            <div className="word-progress-track" style={{ marginTop: "0.35rem" }}>
              <div className={`word-progress-fill ${goalPct >= 100 ? "target-met" : ""}`} style={{ width: `${goalPct}%` }} />
            </div>
            <div className="study-timer-goal-picks">
              <span className="muted-text" style={{ fontSize: "0.78rem" }}>Daily goal:</span>
              {[20, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`study-timer-chip ${stats.goalMinutes === m ? "active" : ""}`}
                  onClick={() => updateGoal(m)}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
