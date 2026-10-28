"""Build data/questions/quant/*.json from seed content, optionally topped up
by live LLM generation.

Usage:
    python -m pipeline.generate_quant
    python -m pipeline.generate_quant --expand 10   # add ~10 more per topic via LLM
"""

import argparse
import json

from .io_utils import write_models
from .llm_client import LLMClient
from .seed_quant import ALGEBRA, ARITHMETIC, DATA_ANALYSIS, GEOMETRY
from .topics import QUANT_TOPICS

EXPAND_PROMPT_TEMPLATE = """You are generating GRE quantitative-reasoning practice questions
for the topic area "{topic_area}" (subtopics: {subtopics}).

Produce {n} new questions as a JSON array, mixing question types from
quant_comparison, quant_multiple_choice, and quant_numeric_entry. Each object's keys
must match one of these examples exactly depending on its qtype:

{examples}

Rules:
- Every numeric answer must be independently verified by you before inclusion -- show your
  work internally, but output ONLY the final JSON array.
- Do not repeat the setup of these existing questions: {existing_ids}
- difficulty must be an integer 1-5
- topic must be one of: {subtopics}
- Respond with ONLY the JSON array, nothing else.
"""


def _expand(topic_area: str, existing: list, n: int, client: LLMClient) -> list:
    if n <= 0:
        return []
    from .schema import QuantComparisonQuestion, QuantMultipleChoiceQuestion, QuantNumericEntryQuestion

    model_by_qtype = {
        "quant_comparison": QuantComparisonQuestion,
        "quant_multiple_choice": QuantMultipleChoiceQuestion,
        "quant_numeric_entry": QuantNumericEntryQuestion,
    }
    examples = {q.qtype: q.model_dump(mode="json") for q in existing}
    prompt = EXPAND_PROMPT_TEMPLATE.format(
        topic_area=topic_area,
        subtopics=QUANT_TOPICS[topic_area],
        n=n,
        examples=json.dumps(examples, indent=2),
        existing_ids=[q.id for q in existing],
    )
    raw = client.generate(prompt)
    try:
        candidates = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"LLM did not return valid JSON for {topic_area}: {e}\nRaw output:\n{raw}")
    return [model_by_qtype[c["qtype"]](**c) for c in candidates]


def main(expand: int = 0):
    arithmetic = list(ARITHMETIC)
    algebra = list(ALGEBRA)
    geometry = list(GEOMETRY)
    data_analysis = list(DATA_ANALYSIS)

    if expand:
        client = LLMClient()
        arithmetic += _expand("arithmetic", arithmetic, expand, client)
        algebra += _expand("algebra", algebra, expand, client)
        geometry += _expand("geometry", geometry, expand, client)
        data_analysis += _expand("data_analysis", data_analysis, expand, client)

    write_models("quant/arithmetic.json", arithmetic)
    write_models("quant/algebra.json", algebra)
    write_models("quant/geometry.json", geometry)
    write_models("quant/data_analysis.json", data_analysis)

    print(
        f"quant: {len(arithmetic)} arithmetic, {len(algebra)} algebra, "
        f"{len(geometry)} geometry, {len(data_analysis)} data_analysis"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--expand",
        type=int,
        default=0,
        help="Number of additional LLM-generated questions to add per topic area "
        "(requires ANTHROPIC_API_KEY).",
    )
    main(expand=parser.parse_args().expand)
