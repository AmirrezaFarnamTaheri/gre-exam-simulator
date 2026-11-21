import { newCard, type SrsCard } from "gre-adaptive-engine";
import words from "../../data/vocab/words.json";
import synonymClustersRaw from "../../data/vocab/synonym_clusters.json";

export interface VocabWord {
  id: string;
  word: string;
  definition: string;
  example: string;
  difficulty: number;
  list: string;
  pos?: string;
  synonyms?: string;
  antonyms?: string;
  gregmatGroup?: number;
  groups?: string[];
}

export interface SynonymCluster {
  id: string;
  words: string[];
  meaning_fa: string;
  anchor: string;
}

export const VOCAB: VocabWord[] = words as VocabWord[];
export const SYNONYM_CLUSTERS: SynonymCluster[] = synonymClustersRaw as SynonymCluster[];

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
