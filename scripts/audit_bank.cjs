const fs = require("fs");
const path = require("path");

const basePath = "F:/StudyTools/gre-study-app/data/questions";
const files = {
  arithmetic: JSON.parse(fs.readFileSync(basePath + "/quant/arithmetic.json", "utf8")),
  algebra: JSON.parse(fs.readFileSync(basePath + "/quant/algebra.json", "utf8")),
  geometry: JSON.parse(fs.readFileSync(basePath + "/quant/geometry.json", "utf8")),
  dataAnalysis: JSON.parse(fs.readFileSync(basePath + "/quant/data_analysis.json", "utf8")),
  textCompletion: JSON.parse(fs.readFileSync(basePath + "/verbal/text_completion.json", "utf8")),
  sentenceEquivalence: JSON.parse(fs.readFileSync(basePath + "/verbal/sentence_equivalence.json", "utf8")),
  readingComprehension: JSON.parse(fs.readFileSync(basePath + "/verbal/reading_comprehension.json", "utf8")),
  passages: JSON.parse(fs.readFileSync(basePath + "/verbal/passages.json", "utf8"))
};

const issues = [];
const idSet = new Set();
const passageIds = new Set(files.passages.map(p => p.id));

// 1. Passage checks
for (const p of files.passages) {
  if (!p.id || !p.title || !p.text) issues.push(`Passage missing fields: ${JSON.stringify(p)}`);
  if (idSet.has(p.id)) issues.push(`Duplicate ID: ${p.id}`);
  idSet.add(p.id);
}

// 2. All questions checks
const allQuestions = [
  ...files.arithmetic,
  ...files.algebra,
  ...files.geometry,
  ...files.dataAnalysis,
  ...files.textCompletion,
  ...files.sentenceEquivalence,
  ...files.readingComprehension
];

console.log(`Total questions to audit: ${allQuestions.length}`);

for (const q of allQuestions) {
  if (!q.id) issues.push(`Missing id on: ${JSON.stringify(q)}`);
  if (idSet.has(q.id)) issues.push(`Duplicate question ID: ${q.id}`);
  idSet.add(q.id);

  if (!["quant", "verbal"].includes(q.section)) issues.push(`${q.id}: Invalid section ${q.section}`);
  if (![1, 2, 3, 4, 5].includes(q.difficulty)) issues.push(`${q.id}: Invalid difficulty ${q.difficulty}`);
  if (!q.explanation || typeof q.explanation !== "string") issues.push(`${q.id}: Missing explanation`);

  // Specific question type audits
  if (q.qtype === "quant_comparison") {
    if (!q.quantity_a || !q.quantity_b) issues.push(`${q.id}: QC missing quantity A or B`);
    if (!["A", "B", "equal", "cannot_determine"].includes(q.correct)) {
      issues.push(`${q.id}: QC invalid correct answer ${q.correct}`);
    }
  } else if (q.qtype === "quant_numeric_entry") {
    if (!q.prompt) issues.push(`${q.id}: Numeric entry missing prompt`);
    if (typeof q.correct !== "string" || q.correct.trim() === "") {
      issues.push(`${q.id}: Numeric entry invalid correct string`);
    }
  } else if (q.qtype === "quant_multiple_choice") {
    if (!q.prompt) issues.push(`${q.id}: MC missing prompt`);
    if (!Array.isArray(q.choices) || q.choices.length < 2) issues.push(`${q.id}: MC invalid choices`);
    if (!Array.isArray(q.correct) || q.correct.length < 1) issues.push(`${q.id}: MC invalid correct array`);
    for (const c of q.correct) {
      if (!q.choices.includes(c)) issues.push(`${q.id}: Correct "${c}" not found in choices: ${q.choices.join(", ")}`);
    }
  } else if (q.qtype === "text_completion") {
    if (!q.passage) issues.push(`${q.id}: TC missing passage`);
    if (!q.choices || typeof q.choices !== "object") issues.push(`${q.id}: TC missing choices`);
    if (!q.correct || typeof q.correct !== "object") issues.push(`${q.id}: TC missing correct`);
    for (const [blank, cList] of Object.entries(q.choices)) {
      const correctChoice = q.correct[blank];
      if (!correctChoice) issues.push(`${q.id}: TC blank "${blank}" has no correct answer specified`);
      if (!cList.includes(correctChoice)) {
        issues.push(`${q.id}: TC blank "${blank}" correct "${correctChoice}" not in choices: ${cList.join(", ")}`);
      }
    }
  } else if (q.qtype === "sentence_equivalence") {
    if (!q.sentence) issues.push(`${q.id}: SE missing sentence`);
    if (!Array.isArray(q.choices) || q.choices.length !== 6) {
      issues.push(`${q.id}: SE choices length must be 6, got ${q.choices ? q.choices.length : 0}`);
    }
    if (!Array.isArray(q.correct) || q.correct.length !== 2) {
      issues.push(`${q.id}: SE correct length must be 2, got ${q.correct ? q.correct.length : 0}`);
    }
    for (const c of q.correct) {
      if (!q.choices.includes(c)) issues.push(`${q.id}: SE correct "${c}" not in choices`);
    }
  } else if (q.qtype === "reading_comprehension") {
    if (!q.passage_id || !passageIds.has(q.passage_id)) {
      issues.push(`${q.id}: RC passage_id "${q.passage_id}" not found in passages.json`);
    }
    if (!q.question) issues.push(`${q.id}: RC missing question`);
    if (!Array.isArray(q.choices) || q.choices.length < 2) issues.push(`${q.id}: RC invalid choices`);
    if (!Array.isArray(q.correct) || q.correct.length < 1) issues.push(`${q.id}: RC invalid correct array`);
    for (const c of q.correct) {
      if (!q.choices.includes(c)) issues.push(`${q.id}: RC correct "${c}" not in choices`);
    }
  } else {
    issues.push(`${q.id}: Unknown qtype ${q.qtype}`);
  }
}

console.log(`\nAudit completed!`);
if (issues.length === 0) {
  console.log("SUCCESS: 0 issues found across all 192 questions and 5 passages!");
} else {
  console.log(`FOUND ${issues.length} ISSUES:`);
  issues.forEach(i => console.log(" - " + i));
  process.exit(1);
}
