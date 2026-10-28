import type { AnyQuestion, Passage } from "./types";

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
}): AnyQuestion[] {
  const all = [
    ...raw.textCompletion,
    ...raw.sentenceEquivalence,
    ...raw.readingComprehension,
    ...raw.arithmetic,
    ...raw.algebra,
    ...raw.geometry,
    ...raw.dataAnalysis,
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
