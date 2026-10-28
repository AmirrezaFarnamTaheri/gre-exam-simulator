import { loadPassages, loadQuestionBank } from "gre-adaptive-engine";

import algebra from "../../data/questions/quant/algebra.json";
import arithmetic from "../../data/questions/quant/arithmetic.json";
import dataAnalysis from "../../data/questions/quant/data_analysis.json";
import geometry from "../../data/questions/quant/geometry.json";
import passagesRaw from "../../data/questions/verbal/passages.json";
import readingComprehension from "../../data/questions/verbal/reading_comprehension.json";
import sentenceEquivalence from "../../data/questions/verbal/sentence_equivalence.json";
import textCompletion from "../../data/questions/verbal/text_completion.json";

export const BANK = loadQuestionBank({
  textCompletion,
  sentenceEquivalence,
  readingComprehension,
  arithmetic,
  algebra,
  geometry,
  dataAnalysis,
});

export const PASSAGES = loadPassages(passagesRaw);

export function getPassageById(id: string) {
  const passage = PASSAGES.find((p) => p.id === id);
  if (!passage) throw new Error(`Unknown passage id: ${id}`);
  return passage;
}
