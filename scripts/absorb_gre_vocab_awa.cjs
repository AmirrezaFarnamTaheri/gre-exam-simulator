#!/usr/bin/env node
/**
 * Merges GRExercise vocab-71.txt (71 high-quality GRE words with meanings,
 * examples, synonyms, antonyms) into GRE vocab JSON.
 * Also absorbs ETS AWA Issue and Argument prompts into a new awa.json file.
 */
"use strict";
const fs   = require("fs");
const path = require("path");

const VOCAB_TXT  = "F:/StudyTools/GRExercise/res/strings/vocab-71.txt";
const ISSUE_DIR  = "F:/StudyTools/GRExercise/res/strings/ets-issue-pool";
const ARG_DIR    = "F:/StudyTools/GRExercise/res/strings/ets-argument-pool";

const GRE_ROOT   = path.join(__dirname, "..");
const VOCAB_FILE = path.join(GRE_ROOT, "data", "vocab", "words.json");
const AWA_FILE   = path.join(GRE_ROOT, "data", "questions", "awa.json");

// ── 1. Merge vocab-71 into words.json ─────────────────────────────────────────
const existing   = JSON.parse(fs.readFileSync(VOCAB_FILE, "utf8"));
const byWord     = new Map(existing.map((w) => [w.word.toLowerCase(), w]));

const raw = fs.readFileSync(VOCAB_TXT, "utf8");
const blocks = raw.split(/\n---\n/).filter(Boolean);

let vocabAdded = 0, vocabEnriched = 0;
for (const block of blocks) {
  const wordMatch   = block.match(/^\d+\.\s+([A-Z]+)/m);
  const typeMatch   = block.match(/^type:\s*(.+)/m);
  const meaningLine = block.match(/^meaning:\s*(.+)/m);
  const exLine      = block.match(/\[([^\]]+)\]/);        // first example sentence
  const synLine     = block.match(/^synonymous:\s*(.+)/m);
  const antLine     = block.match(/^antonymous:\s*(.+)/m);

  if (!wordMatch || !meaningLine) continue;

  const word       = wordMatch[1].toLowerCase();
  const definition = meaningLine[1].replace(/;$/, "").split(";")[0].trim();
  const pos        = typeMatch ? typeMatch[1].replace(/[()]/g, "").split(" ")[0].trim() : "";
  const example    = exLine ? exLine[1].trim() : "";
  const synonyms   = synLine && synLine[1].trim() !== "" ? synLine[1].trim() : "";
  const antonyms   = antLine && antLine[1].trim() !== "" ? antLine[1].trim() : "";

  if (byWord.has(word)) {
    // Enrich: add example and antonyms if missing
    const entry = byWord.get(word);
    let changed = false;
    if (!entry.example && example) { entry.example = example; changed = true; }
    if (!entry.synonyms && synonyms) { entry.synonyms = synonyms; changed = true; }
    if (antonyms) { entry.antonyms = antonyms; changed = true; }
    if (changed) vocabEnriched++;
  } else {
    byWord.set(word, {
      id:         "gv_" + word.replace(/[^a-z0-9]+/g, "_"),
      word,
      definition,
      example,
      pos,
      synonyms,
      antonyms,
      difficulty: 4,   // vocab-71 are harder GRE words
      list:       "GRE High-Frequency",
    });
    vocabAdded++;
  }
}

const vocabWords = [...byWord.values()].sort((a, b) => a.word.localeCompare(b.word));
fs.writeFileSync(VOCAB_FILE, JSON.stringify(vocabWords, null, 1) + "\n");
console.log(`words.json: +${vocabAdded} new, ${vocabEnriched} enriched → ${vocabWords.length} total`);

// ── 2. Build AWA prompts → awa.json ───────────────────────────────────────────
fs.mkdirSync(path.dirname(AWA_FILE), { recursive: true });

const awaPrompts = [];

// Issue pool: 150 prompts
const issueCount = 150;
for (let i = 1; i <= issueCount; i++) {
  const qFile = path.join(ISSUE_DIR, `${i}q.txt`);
  const dFile = path.join(ISSUE_DIR, `${i}d.txt`);
  if (!fs.existsSync(qFile)) continue;
  const question    = fs.readFileSync(qFile, "utf8").trim();
  const directions  = fs.existsSync(dFile) ? fs.readFileSync(dFile, "utf8").trim() : "";
  awaPrompts.push({
    id:         `awa_issue_${String(i).padStart(3, "0")}`,
    type:       "issue",
    prompt:     question,
    directions,
    source:     "ETS-GRE-pool",
  });
}

// Argument pool: 176 prompts
const argCount = 176;
for (let i = 1; i <= argCount; i++) {
  const qFile = path.join(ARG_DIR, `${i}q.txt`);
  const dFile = path.join(ARG_DIR, `${i}d.txt`);
  if (!fs.existsSync(qFile)) continue;
  const question    = fs.readFileSync(qFile, "utf8").trim();
  const directions  = fs.existsSync(dFile) ? fs.readFileSync(dFile, "utf8").trim() : "";
  awaPrompts.push({
    id:         `awa_arg_${String(i).padStart(3, "0")}`,
    type:       "argument",
    prompt:     question,
    directions,
    source:     "ETS-GRE-pool",
  });
}

fs.writeFileSync(AWA_FILE, JSON.stringify(awaPrompts, null, 2) + "\n");
console.log(`awa.json: ${awaPrompts.filter((p) => p.type === "issue").length} Issue +`,
            `${awaPrompts.filter((p) => p.type === "argument").length} Argument prompts`);
