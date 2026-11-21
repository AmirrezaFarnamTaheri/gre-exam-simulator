import { loadDiDatasets, loadPassages, loadQuestionBank } from "gre-adaptive-engine";

import algebra from "../../data/questions/quant/algebra.json";
import arithmetic from "../../data/questions/quant/arithmetic.json";
import dataAnalysis from "../../data/questions/quant/data_analysis.json";
import dataInterpretation from "../../data/questions/quant/data_interpretation.json";
import diDatasetsRaw from "../../data/questions/quant/di_datasets.json";
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
  dataInterpretation,
});

export const PASSAGES = loadPassages(passagesRaw);
export const DI_DATASETS = loadDiDatasets(diDatasetsRaw);

export function getPassageById(id: string) {
  const passage = PASSAGES.find((p) => p.id === id);
  if (!passage) throw new Error(`Unknown passage id: ${id}`);
  return passage;
}

export function getDiDatasetById(id: string) {
  const ds = DI_DATASETS.find((d) => d.id === id);
  if (!ds) throw new Error(`Unknown DI dataset id: ${id}`);
  return ds;
}
