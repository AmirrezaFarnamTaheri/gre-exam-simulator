import type { AnyQuestion, DataInterpretationDataset, Passage } from "./types";

/**
 * Pure transform: takes the already-parsed JSON arrays produced by the Python
 * pipeline (data/questions/**\/*.json) and returns a flat, typed bank. Deliberately
 * takes raw arrays rather than reading files itself, so it works the same whether
 * the caller got the JSON via static import (Next.js build), fetch (client), or fs
 * (Node scripts/tests).
 */
export function loadQuestionBank(raw: {
  textCompletion: unknown[];
  sentenceEquivalence: unknown[];
  readingComprehension: unknown[];
  arithmetic: unknown[];
  algebra: unknown[];
  geometry: unknown[];
  dataAnalysis: unknown[];
  dataInterpretation?: unknown[];
}): AnyQuestion[] {
  const all = [
    ...raw.textCompletion,
    ...raw.sentenceEquivalence,
    ...raw.readingComprehension,
    ...raw.arithmetic,
    ...raw.algebra,
    ...raw.geometry,
    ...raw.dataAnalysis,
    ...(raw.dataInterpretation ?? []),
  ];
  for (const q of all) {
    if (typeof q !== "object" || q === null || !("id" in q) || !("qtype" in q) || !("topic" in q)) {
      throw new Error(`Malformed question in bank: ${JSON.stringify(q)}`);
    }
  }
  return all as AnyQuestion[];
}

export function loadPassages(raw: unknown[]): Passage[] {
  for (const p of raw) {
    if (typeof p !== "object" || p === null || !("id" in p) || !("text" in p)) {
      throw new Error(`Malformed passage: ${JSON.stringify(p)}`);
    }
  }
  return raw as Passage[];
}

export function loadDiDatasets(raw: unknown[]): DataInterpretationDataset[] {
  for (const d of raw) {
    if (typeof d !== "object" || d === null || !("id" in d) || !("headers" in d) || !("rows" in d)) {
      throw new Error(`Malformed DI dataset: ${JSON.stringify(d)}`);
    }
  }
  return raw as DataInterpretationDataset[];
}
