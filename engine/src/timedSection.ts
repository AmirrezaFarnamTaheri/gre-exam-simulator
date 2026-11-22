import type { AdaptiveDifficultyBand, AnyQuestion, ReadingComprehensionQuestion, Section } from "./types";

function shuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function selectTimedSection(
  bank: AnyQuestion[],
  timedReading: ReadingComprehensionQuestion[],
  section: Section,
  count: number,
  band: AdaptiveDifficultyBand,
  excluded: ReadonlySet<string>,
  random = Math.random,
): AnyQuestion[] {
  const levels = band === "hard" ? [4, 5] : band === "easy" ? [1, 2, 3] : [2, 3, 4];
  function ranked<T extends AnyQuestion>(items: T[]) {
    return shuffle(items, random).sort(
      (a, b) => Number(levels.includes(b.difficulty)) - Number(levels.includes(a.difficulty)),
    );
  }

  const available = ranked(bank.filter((question) => question.section === section && !excluded.has(question.id)));
  if (section === "quant") {
    const data = available.filter((question) => question.qtype === "data_interpretation").slice(0, Math.min(count, 2));
    const other = available.filter((question) => question.qtype !== "data_interpretation");
    return shuffle([...other.slice(0, count - data.length), ...data], random);
  }

  const seenPassages = new Set(timedReading.filter((question) => excluded.has(question.id)).map((question) => question.passage_id));
  const groups = new Map<string, ReadingComprehensionQuestion[]>();
  for (const question of timedReading) {
    if (seenPassages.has(question.passage_id)) continue;
    const group = groups.get(question.passage_id) ?? [];
    group.push(question);
    groups.set(question.passage_id, group);
  }
  const passages = shuffle([...groups.values()], random).sort((a, b) =>
    b.filter((question) => levels.includes(question.difficulty)).length -
    a.filter((question) => levels.includes(question.difficulty)).length,
  );
  const reading: ReadingComprehensionQuestion[][] = [];
  let readingCount = 0;
  const readingTarget = Math.round(count / 4) * 2;
  for (const group of passages) {
    if (readingCount + group.length > Math.min(count, readingTarget)) continue;
    reading.push(group);
    readingCount += group.length;
  }
  const sentenceCount = count - readingCount;
  const equivalence = available.filter((question) => question.qtype === "sentence_equivalence").slice(0, Math.floor(sentenceCount / 2));
  const completion = available.filter((question) => question.qtype === "text_completion").slice(0, sentenceCount - equivalence.length);
  return shuffle([...reading, ...completion.map((question) => [question]), ...equivalence.map((question) => [question])], random).flat();
}

