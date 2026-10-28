const fs = require('fs');
const path = require('path');

const verbalDir = path.join(__dirname, '../data/questions/verbal');

const newTC = [
  {
    id: "v-tc-09",
    section: "verbal",
    qtype: "text_completion",
    topic: "text_completion_single_blank",
    difficulty: 4,
    explanation: "The contrast 'Though known for long-winded treatises' indicates his remarks were concise/brief, hence 'laconic'.",
    source: "seed",
    tags: ["verified", "gre_vocab"],
    passage: "Though widely known for his lengthy, verbose treatises, the philosopher's actual debate remarks were remarkably (i)______, often lasting no more than three sentences.",
    choices: {
      "i": ["laconic", "loquacious", "polemical"]
    },
    correct: {
      "i": "laconic"
    }
  },
  {
    id: "v-tc-10",
    section: "verbal",
    qtype: "text_completion",
    topic: "text_completion_double_blank",
    difficulty: 4,
    explanation: "The first blank describes the ephemeral (short-lived) nature of fleeting internet fame, contrasting with lasting (enduring) artistic contributions.",
    source: "seed",
    tags: ["verified", "gre_vocab"],
    passage: "Critics observed that the singer's viral fame proved largely (i)______, vanishing within months, whereas her classical compositions achieved an (ii)______ legacy that influenced generations.",
    choices: {
      "i": ["ephemeral", "perennial", "unprecedented"],
      "ii": ["enduring", "precarious", "insipid"]
    },
    correct: {
      "i": "ephemeral",
      "ii": "enduring"
    }
  },
  {
    id: "v-tc-11",
    section: "verbal",
    qtype: "text_completion",
    topic: "text_completion_triple_blank",
    difficulty: 5,
    explanation: "Blank (i) 'mercurial' or 'capricious' fits unpredictable mood. Blank (ii) 'placate' or 'mollify' matches soothing anger. Blank (iii) 'equanimity' describes regained calm composure.",
    source: "seed",
    tags: ["verified", "triple_blank"],
    passage: "Given the executive's famously (i)______ temperament, staff members scrambled to (ii)______ his anger following the quarterly loss, hoping he would recover his customary (iii)______ before meeting the board.",
    choices: {
      "i": ["capricious", "placid", "dogmatic"],
      "ii": ["mollify", "exacerbate", "scrutinize"],
      "iii": ["equanimity", "audacity", "truculence"]
    },
    correct: {
      "i": "capricious",
      "ii": "mollify",
      "iii": "equanimity"
    }
  },
  {
    id: "v-tc-12",
    section: "verbal",
    qtype: "text_completion",
    topic: "text_completion_single_blank",
    difficulty: 3,
    explanation: "'Esoteric' refers to knowledge intended for or understood by only a small, specialized circle.",
    source: "seed",
    tags: ["verified", "gre_vocab"],
    passage: "The theoretical physicist's latest paper was written in such (i)______ terminology that only a handful of quantum cosmologists worldwide could comprehend its derivations.",
    choices: {
      "i": ["esoteric", "lucid", "pedestrian"]
    },
    correct: {
      "i": "esoteric"
    }
  }
];

const newSE = [
  {
    id: "v-se-09",
    section: "verbal",
    qtype: "sentence_equivalence",
    topic: "sentence_equivalence",
    difficulty: 4,
    explanation: "'Mitigate' and 'alleviate' both mean to make less severe or relieve the water shortage.",
    source: "seed",
    tags: ["verified", "synonym_pair"],
    sentence: "The local government implemented emergency rationing to ______ the devastating impact of the prolonged summer drought on agricultural yields.",
    choices: ["mitigate", "exacerbate", "alleviate", "forestall", "accentuate", "document"],
    correct: ["mitigate", "alleviate"]
  },
  {
    id: "v-se-10",
    section: "verbal",
    qtype: "sentence_equivalence",
    topic: "sentence_equivalence",
    difficulty: 4,
    explanation: "'Ubiquitous' and 'omnipresent' both mean found everywhere.",
    source: "seed",
    tags: ["verified", "synonym_pair"],
    sentence: "Within a single decade, smartphones evolved from luxury novelties into ______ devices carried by almost every adult in modern metropolitan society.",
    choices: ["ubiquitous", "ephemeral", "superfluous", "omnipresent", "anomalous", "cumbersome"],
    correct: ["ubiquitous", "omnipresent"]
  },
  {
    id: "v-se-11",
    section: "verbal",
    qtype: "sentence_equivalence",
    topic: "sentence_equivalence",
    difficulty: 4,
    explanation: "'Taciturn' and 'reticent' both mean reserved or untalkative.",
    source: "seed",
    tags: ["verified", "synonym_pair"],
    sentence: "While his sister was extroverted and gregarious, Mark remained notoriously ______, offering only single-syllable replies even to close family members.",
    choices: ["loquacious", "taciturn", "reticent", "ebullient", "diffident", "obstinate"],
    correct: ["taciturn", "reticent"]
  },
  {
    id: "v-se-12",
    section: "verbal",
    qtype: "sentence_equivalence",
    topic: "sentence_equivalence",
    difficulty: 3,
    explanation: "'Spurious' and 'specious' both refer to arguments that appear plausible on the surface but are actually false or invalid.",
    source: "seed",
    tags: ["verified", "synonym_pair"],
    sentence: "The defense attorney dismantled the prosecution's claim by exposing the ______ reasoning upon which the entire forensic hypothesis was constructed.",
    choices: ["spurious", "compelling", "specious", "cogent", "unassailable", "tenuous"],
    correct: ["spurious", "specious"]
  }
];

function mergeQuestions(filePath, newItems) {
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const ids = new Set(existing.map(q => q.id));
  const added = [];
  for (const item of newItems) {
    if (!ids.has(item.id)) {
      existing.push(item);
      added.push(item.id);
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
  console.log(`Updated ${path.basename(filePath)}: added ${added.length} questions. Total: ${existing.length}`);
}

mergeQuestions(path.join(verbalDir, 'text_completion.json'), newTC);
mergeQuestions(path.join(verbalDir, 'sentence_equivalence.json'), newSE);
