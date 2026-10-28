"""Entry point: runs both generators and writes the full question bank.

    python -m pipeline.build
    python -m pipeline.build --expand 10
"""

import argparse

from .generate_quant import main as generate_quant
from .generate_verbal import main as generate_verbal


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--expand",
        type=int,
        default=0,
        help="Number of additional LLM-generated questions to add per type/topic "
        "(requires ANTHROPIC_API_KEY).",
    )
    args = parser.parse_args()

    generate_verbal(expand=args.expand)
    generate_quant(expand=args.expand)


if __name__ == "__main__":
    main()
