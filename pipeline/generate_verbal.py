"""Build data/questions/verbal/*.json from seed content, optionally topped up
by live LLM generation.

Usage:
    python -m pipeline.generate_verbal
    python -m pipeline.generate_verbal --expand 10   # add ~10 more per type via LLM
"""

import argparse
import json

from .io_utils import write_models
from .llm_client import LLMClient
from .passages import PASSAGES
from .schema import VERBAL_MODELS
from .seed_verbal import READING_COMPREHENSION, SENTENCE_EQUIVALENCE, TEXT_COMPLETION

EXPAND_PROMPT_TEMPLATE = """You are generating GRE verbal-reasoning practice questions.

Produce {n} new "{qtype}" questions as a JSON array. Each object must match this
shape exactly (same keys), with no commentary outside the JSON array:

{example}

Rules:
- Do not repeat wording, topics, or vocabulary from these existing questions: {existing_ids}
- difficulty must be an integer 1-5
- topic should be a short snake_case tag
- Respond with ONLY the JSON array, nothing else.
"""


def _expand(qtype: str, existing: list, n: int, client: LLMClient) -> list:
    if n <= 0:
        return []
    model_cls = VERBAL_MODELS[qtype]
    example = existing[0].model_dump(mode="json") if existing else {}
    prompt = EXPAND_PROMPT_TEMPLATE.format(
        n=n,
        qtype=qtype,
        example=json.dumps(example, indent=2),
        existing_ids=[q.id for q in existing],
    )
    raw = client.generate(prompt)
    try:
        candidates = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"LLM did not return valid JSON for {qtype}: {e}\nRaw output:\n{raw}")
    return [model_cls(**c) for c in candidates]


def main(expand: int = 0):
    text_completion = list(TEXT_COMPLETION)
    sentence_equivalence = list(SENTENCE_EQUIVALENCE)
    reading_comprehension = list(READING_COMPREHENSION)

    if expand:
        client = LLMClient()
        text_completion += _expand("text_completion", text_completion, expand, client)
        sentence_equivalence += _expand("sentence_equivalence", sentence_equivalence, expand, client)
        reading_comprehension += _expand("reading_comprehension", reading_comprehension, expand, client)

    write_models("verbal/text_completion.json", text_completion)
    write_models("verbal/sentence_equivalence.json", sentence_equivalence)
    write_models("verbal/reading_comprehension.json", reading_comprehension)
    write_models("verbal/passages.json", PASSAGES)

    print(
        f"verbal: {len(text_completion)} text_completion, "
        f"{len(sentence_equivalence)} sentence_equivalence, "
        f"{len(reading_comprehension)} reading_comprehension, "
        f"{len(PASSAGES)} passages"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--expand",
        type=int,
        default=0,
        help="Number of additional LLM-generated questions to add per question type "
        "(requires ANTHROPIC_API_KEY).",
    )
    main(expand=parser.parse_args().expand)
