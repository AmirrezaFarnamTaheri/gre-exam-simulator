import { newCard, type SrsCard } from "gre-adaptive-engine";
import words from "../../data/vocab/words.json";

export interface VocabWord {
  id: string;
  word: string;
  definition: string;
  example: string;
  difficulty: number;
  list: string;
  pos?: string;
  synonyms?: string;
}

export const VOCAB: VocabWord[] = words as VocabWord[];

const KEY = "gre-study-vocab-srs-v1";

export type VocabProgress = Record<string, SrsCard>;

export function loadVocabProgress(): VocabProgress {
  if (typeof localStorage === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "{}");
    return parsed && typeof parsed === "object" ? (parsed as VocabProgress) : {};
  } catch {
    return {};
  }
}

export function saveVocabProgress(progress: VocabProgress): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(progress));
}

export function cardFor(progress: VocabProgress, id: string, now: number): SrsCard {
  return progress[id] ?? newCard(now);
}
