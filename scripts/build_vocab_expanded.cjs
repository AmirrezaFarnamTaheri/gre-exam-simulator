#!/usr/bin/env node
/**
 * Expands data/vocab/words.json from 781 → 2800+ GRE words.
 * Sources (priority order):
 *   1. GRE-Flashcards/wm.csv  – word, Python dict of POS→meanings, synonyms list (2817 entries)
 *   2. existing words.json    – keeps difficulty/list metadata from wordsta
 *
 * Format of wm.csv: row_index, word, meaning_dict_str, synonyms_list_str
 * We parse meaning_dict using a JS-safe regex (no eval needed).
 */
"use strict";
const fs   = require("fs");
const path = require("path");

const WM_CSV   = "F:/StudyTools/GRE-Flashcards/wm.csv";
const OUT_FILE = path.join(__dirname, "..", "data", "vocab", "words.json");

// ── helpers ──────────────────────────────────────────────────────────────────

/** Extract the FIRST definition string from a Python dict literal like:
 *  "{'Noun': ['a feeling of strong eagerness ...'], 'Verb': ['to do X']}"
 *  Returns "a feeling of strong eagerness ..."  (first item of first list)
 */
function extractDefinition(raw) {
  if (!raw) return "";
  // Find the first quoted string inside the list
  // Pattern: : ['some text...']  or  : ["some text..."]
  const m = raw.match(/:\s*\[['"]([^'"]+)/);
  if (m) return m[1].trim();
  // Fallback: just strip Python punctuation and return first sentence
  return raw
    .replace(/[{}'"\[\]]/g, "")
    .replace(/[A-Z][a-z]+:/g, "")
    .split(",")[0]
    .trim()
    .slice(0, 200);
}

/** Extract POS tag from the dict key like 'Noun' or 'Verb, Adjective' */
function extractPos(raw) {
  if (!raw) return "";
  const m = raw.match(/'([A-Z][a-z]+)'/);
  return m ? m[1].toLowerCase() : "";
}

/** Parse a Python list literal like "['foo', 'bar', \"baz\"]" into JS array */
function parsePyList(raw) {
  if (!raw) return [];
  try {
    // Replace single quotes with double, but be careful of apostrophes
    const json = raw
      .replace(/^\[/, "[")
      .replace(/\]$/, "]")
      .replace(/'/g, '"');
    return JSON.parse(json);
  } catch {
    return [];
  }
}

// ── load existing words.json for metadata enrichment ─────────────────────────
let existingByWord = new Map();
if (fs.existsSync(OUT_FILE)) {
  const existing = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
  for (const w of existing) existingByWord.set(w.word.toLowerCase(), w);
}

// ── parse wm.csv ──────────────────────────────────────────────────────────────
const lines = fs.readFileSync(WM_CSV, "utf8").split(/\r?\n/).filter(Boolean);
const seen  = new Map(); // word → entry

for (const line of lines) {
  // CSV format: index,"word","meaning","synonyms"
  // Some fields are quoted (with commas inside), split carefully.
  // Use a simple state machine: split on comma only outside quotes.
  const cols = splitCsv(line);
  if (cols.length < 3) continue;

  const word = String(cols[1] || "").replace(/^"|"$/g, "").trim().toLowerCase();
  if (!word || word === "word" || !/^[a-z]/.test(word)) continue;

  const meaningRaw  = cols[2] || "";
  const synonymsRaw = cols.slice(3).join(",") || "";

  const definition = extractDefinition(meaningRaw);
  if (!definition) continue;

  const pos      = extractPos(meaningRaw);
  const synonyms = parsePyList(synonymsRaw).slice(0, 5).join(", ");

  const existing = existingByWord.get(word);

  seen.set(word, {
    id:         "gv_" + word.replace(/[^a-z0-9]+/g, "_"),
    word,
    definition,
    example:    existing?.example ?? "",
    difficulty: existing?.difficulty ?? 3,
    list:       existing?.list ?? "GRE Core",
    pos,
    synonyms,
  });
}

// ── merge: existing words without wm.csv entry keep their data ────────────────
for (const [word, entry] of existingByWord) {
  if (!seen.has(word)) seen.set(word, entry);
}

// ── sort and write ────────────────────────────────────────────────────────────
const words = [...seen.values()].sort((a, b) => a.word.localeCompare(b.word));
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(words, null, 1) + "\n");

console.log(
  `Wrote ${words.length} words;`,
  `${words.filter((w) => w.example).length} with examples;`,
  `${words.filter((w) => w.synonyms).length} with synonyms`
);

// ── CSV split helper ──────────────────────────────────────────────────────────
function splitCsv(line) {
  const cols = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      cols.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}
