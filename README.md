# GRE Exam Simulator & Adaptive Study Suite

A free, local-first GRE study and full exam simulation workspace built for the post-September 2023 Shortened GRE. Progress, Elo-style topic ratings, SRS vocabulary scheduling, and exam logs stay in your browser with zero accounts or paywalls.

> **Not affiliated with ETS.** This is an independent study project built for personal exam preparation.

## Key Capabilities

- **1,749 Curated Questions (`data/questions/`)**:
  - **Verbal Reasoning**: 864 Text Completion (1-blank, 2-blank, and 3-blank), 575 Sentence Equivalence, and Reading Comprehension passages.
  - **Quantitative Reasoning**: 267 Quantitative Comparison, Multiple Choice, and Numeric Entry questions plus 8 Data Interpretation datasets (23 DI questions with rendered charts and tables).
- **Authentic Shortened GRE Exam Simulators (`/exam/`)**:
  - **Full-Length 1h 58m Mock (`/exam/full`)**: Analytical Writing (30m) + Verbal S1 (12 Q, 18m) + Quant S1 (12 Q, 21m) + Adaptive Verbal S2 (15 Q, 23m) + Adaptive Quant S2 (15 Q, 26m) with combined 260-340 score reporting.
  - **2-Stage Section-Adaptive Exams (`/exam/quant`, `/exam/verbal`)**: Automatic Easy / Medium / Hard Section 2 routing, on-screen ETS GRE Calculator with display transfer, Review modal, Mark for Review, and per-question timing diagnostics.
- **Elo-Adaptive Study & Mistake Notebook (`/study/`)**:
  - Per-topic mastery tracking calibrated around a ~65% target success rate.
  - Dedicated Mistake Notebook (`/study/mistakes`) that isolates unresolved errors until mastered.
- **Vocabulary Lab (`/vocab`)**:
  - 3,046 GRE words with SM-2 spaced repetition, GregMat Groups 01-32 filters, and a Sentence Equivalence Synonym-Pair Drill covering 369 synonym clusters.
- **AWA Issue Studio (`/awa`)**:
  - 114 Analyze an Issue prompts paired with structured brainstorming outlines, 30-minute timer, live 400-550 word target bar, and a Bring-Your-Own-Key (BYOK) AI rubric grader plus one-click prompt copy.
- **Reference Hub (`/guides`)**:
  - Quantitative formula cheatsheet, Reading Comprehension playbook, Shortened GRE adaptive scoring rules, and structured study planner.
- **Accessible Scholarly Desk UI**:
  - Light and Dark themes verified to WCAG AA contrast standards (`>= 4.5:1`), responsive desktop and mobile navigation, keyboard-accessible dialogs, and JSON progress export/import.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18 or later (includes npm)
- [Python](https://www.python.org) 3.10+ (optional, only for regenerating data banks)

### Run Locally

Double-click **`GRE-Exam-Simulator.exe`** in the project root to start the local server automatically and open the app in your default browser (close the launcher window to stop the server cleanly).

Or run from a terminal:

```sh
npm install
npm run dev --workspace=web
```

Open **http://localhost:3000**.

### Verification Commands

```sh
npm run test --workspace=engine
npm run typecheck --workspace=engine
npm run typecheck --workspace=web
npm run build --workspace=web
```

## Project Structure

```text
gre-exam-simulator/
  data/              Question bank, vocab deck, synonym clusters, AWA prompts, and reference guides
  engine/            Framework-agnostic TypeScript adaptive rating & section-routing engine (Vitest)
  scripts/           Curated dataset ingestion utilities
  web/               Next.js App Router frontend
  DESIGN.md          Visual design tokens and accessibility specification
```

## License

[MIT](LICENSE)
