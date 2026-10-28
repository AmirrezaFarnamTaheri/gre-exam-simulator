import { createInitialState } from "./engine";
import type { AdaptiveState } from "./types";

const STORAGE_KEY = "gre-study-adaptive-state-v1";

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

export function loadState(): AdaptiveState {
  if (!hasLocalStorage()) return createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return createInitialState(); // no migrations defined yet
    return parsed as AdaptiveState;
  } catch {
    return createInitialState();
  }
}

export function saveState(state: AdaptiveState): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportState(state: AdaptiveState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): AdaptiveState {
  const parsed = JSON.parse(json);
  if (parsed?.version !== 1 || !parsed.sectionRatings || !parsed.topicStats || !parsed.attempts) {
    throw new Error("Invalid adaptive state file");
  }
  return parsed as AdaptiveState;
}
