"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createInitialState,
  loadState,
  saveState,
  recordAnswer as engineRecordAnswer,
} from "gre-adaptive-engine";
import type { AdaptiveState, AnyQuestion } from "gre-adaptive-engine";

/**
 * Wraps the adaptive engine's pure functions with React state + localStorage
 * persistence. Starts from createInitialState() on both server and first client
 * render (so SSR/hydration match), then swaps in the real saved state right
 * after mount -- a one-frame "flash" of default ratings is expected and fine
 * for a personal single-user tool.
 */
export function useAdaptiveState() {
  const [state, setState] = useState<AdaptiveState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const recordAnswer = useCallback((question: AnyQuestion, correct: boolean) => {
    setState((prev) => engineRecordAnswer(prev, question, correct));
  }, []);

  const replaceState = useCallback((next: AdaptiveState) => {
    setState(next);
  }, []);

  return { state, recordAnswer, replaceState, hydrated };
}
