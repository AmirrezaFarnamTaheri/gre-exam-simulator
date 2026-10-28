"""Pluggable LLM hook for scaling up question generation beyond the seed set.

Nothing calls this by default. generate_verbal.py / generate_quant.py only
invoke it when run with --expand, and only after confirming a key is present.
Drop in ANTHROPIC_API_KEY when you're ready to generate at volume; until then
the pipeline runs entirely off hand-authored seed content.
"""

import os


class LLMClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")

    def available(self) -> bool:
        return bool(self.api_key)

    def generate(self, prompt: str, *, model: str = "claude-sonnet-5", max_tokens: int = 2048) -> str:
        if not self.available():
            raise RuntimeError(
                "No ANTHROPIC_API_KEY set. Export it in your environment to enable "
                "live generation via --expand; without it, generators fall back to "
                "seed content only."
            )
        from anthropic import Anthropic  # imported lazily so it's an optional dep

        client = Anthropic(api_key=self.api_key)
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
