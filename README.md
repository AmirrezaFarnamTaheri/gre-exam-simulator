# GRE Adaptive Study App

A personal, free, adaptive GRE study tool: a Python pipeline generates verbal and
quantitative practice questions, a TypeScript engine adapts question difficulty to
your performance (per topic, Elo-style), and a Next.js app lets you actually study
against it. Progress is stored locally in your browser — no account, no server,
no cost.

> **Not affiliated with ETS.** This is an independent hobby project. Question
> content is either original or generated, not copied from ETS/Khan Academy/any
> test-prep vendor.

## Why this exists

Like any student wanting to go to grad school, the GRE was just one more
requirement standing between me and the programs I wanted to apply to. So I
went looking for how to actually prepare for it — and found surprisingly few
free options, and none of them fleshed out. Khan Academy has a set of
ETS-partnered videos that cover content review, and sites like Magoosh explain
the test format well, but neither of those is a place to actually *practice*:
there's no single free tool that adapts to what you personally get right or
wrong and gives you more of what you need. The adaptive platforms that do
exist are almost all paid.

This project is my attempt to close that gap. It's a baseline, not a finished
product — the question bank is intentionally small to start, and the
difficulty model is simple. But it's a real, working start toward a free,
open, genuinely adaptive way to study for the GRE, built so it can keep
growing: more questions, better content, and a clearer picture over time of
what "adaptive" should actually mean for someone studying on their own, with
no budget for test prep and no interest in waiting for one to show up.

## How it works

- **[`pipeline/`](pipeline)** — Python scripts that produce the question bank
  (`data/questions/*.json`) from hand-authored seed content, with a schema
  (pydantic) every question is validated against and an optional hook to expand
  the bank via an LLM (`ANTHROPIC_API_KEY`).
- **[`engine/`](engine)** — a small TypeScript package with no UI dependencies:
  given your answer history, it picks the next question by biasing toward your
  weakest topics and matching difficulty to a ~65% expected-success rate, then
  updates a per-topic rating after each answer. Has its own test suite (vitest).
- **[`web/`](web)** — the Next.js app you actually study in: a dashboard showing
  your ratings per topic, and a study session that renders each question type
  (text completion, sentence equivalence, reading comprehension, quantitative
  comparison, multiple choice, numeric entry) and records your answers.

The generated `data/questions/*.json` is committed to this repo, so you don't
need Python installed just to use the app — only if you want to regenerate or
expand the question bank yourself.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 18 or later (includes npm)
- [Python](https://www.python.org) 3.10+ — only needed if you want to regenerate
  or expand the question bank

### Run the app

```sh
git clone https://github.com/<your-username>/gre-study-app.git
cd gre-study-app
npm install
npm run dev --workspace=web
```

Then open **http://localhost:3000**.

`npm install` at the repo root installs dependencies for both the `engine` and
`web` workspaces (this is an npm-workspaces monorepo). `npm run dev` starts a
long-running dev server — stop it with `Ctrl+C` in that terminal when you're done.

#### Windows convenience shortcut

[`start-study-app.bat`](start-study-app.bat) starts the dev server and opens
your browser automatically. Right-click it → **Create shortcut**, then move
the shortcut to your Desktop for one-click launching.

### Running tests / typechecking

```sh
npm run test --workspace=engine        # adaptive engine unit tests
npm run typecheck --workspace=engine
npm run typecheck --workspace=web
npm run build --workspace=web          # production build check
```

### Regenerating the question bank (optional)

```sh
pip install -r requirements.txt
python -m pipeline.build
```

Add `--expand N` to top up each topic with N additional LLM-generated questions
(requires `ANTHROPIC_API_KEY` in your environment):

```sh
python -m pipeline.build --expand 10
```

## Project structure

```
gre-study-app/
  pipeline/          Python content-generation pipeline
  data/questions/    generated question bank (JSON)
  engine/            adaptive selection engine (TypeScript, framework-agnostic)
  web/               Next.js app
```

## Backing up your progress

The dashboard has **Export progress** / **Import progress** buttons — your
ratings and answer history live in your browser's localStorage, so use these
to back them up or move them to another browser/device.

## License

[MIT](LICENSE)
