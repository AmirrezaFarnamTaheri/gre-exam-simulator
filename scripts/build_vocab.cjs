// Builds data/vocab/words.json from the wordsta GRE/TOEFL word lists.
const fs = require("fs");
const path = require("path");
const src = "F:/StudyTools/wordsta/app/lists";
const out = path.join(__dirname, "..", "data", "vocab", "words.json");
const lists = [["warm-up", "Warm-up"], ["intermediate", "Intermediate"], ["hard", "Hard"], ["high-frequency-gre", "High-frequency GRE"]];
const seen = new Map();
for (const [file, label] of lists) {
  const text = fs.readFileSync(path.join(src, file + ".js"), "utf8").replace("export const words =", "module.exports =");
  const m = { exports: {} };
  new Function("module", text)(m);
  for (const w of m.exports) {
    const word = String(w.word || "").trim().toLowerCase();
    const definition = String(w.definition || "").trim();
    if (!word || !definition || seen.has(word)) continue;
    seen.set(word, {
      id: "v_" + word.replace(/[^a-z]+/g, "_"),
      word,
      definition,
      example: w.example ? String(w.example).trim() : "",
      difficulty: Number(w.difficulty) || 0,
      list: label,
    });
  }
}
const words = [...seen.values()].sort((a, b) => a.word.localeCompare(b.word));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(words, null, 1) + "\n");
console.log("wrote", words.length, "words;", words.filter((w) => w.example).length, "with examples");
