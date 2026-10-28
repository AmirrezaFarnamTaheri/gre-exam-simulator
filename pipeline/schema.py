"""Question schema shared by the verbal and quant generators.

Every question, however it's produced (hand-authored seed or LLM-generated),
must validate against one of these models before it's written to data/questions/.
`difficulty` (1-5) is the hook the adaptive engine will use to pick the next
question; `topic` is the skill tag used to target weak areas.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

Section = Literal["verbal", "quant"]
Difficulty = Literal[1, 2, 3, 4, 5]
Source = Literal["seed", "llm"]


class QuestionBase(BaseModel):
    id: str
    section: Section
    qtype: str
    topic: str
    difficulty: Difficulty
    explanation: str
    source: Source = "seed"
    tags: list[str] = Field(default_factory=list)


class TextCompletionQuestion(QuestionBase):
    section: Literal["verbal"] = "verbal"
    qtype: Literal["text_completion"] = "text_completion"
    passage: str  # contains (i), (ii), (iii) blank markers
    choices: dict[str, list[str]]  # {"i": ["word1", "word2", "word3"], ...}
    correct: dict[str, str]  # {"i": "word1", ...}

    @model_validator(mode="after")
    def _check_blanks(self):
        if set(self.choices) != set(self.correct):
            raise ValueError(f"{self.id}: choices/correct blank keys mismatch")
        for key, options in self.choices.items():
            if len(options) != 3:
                raise ValueError(f"{self.id}: blank '{key}' must have exactly 3 choices")
            if self.correct[key] not in options:
                raise ValueError(f"{self.id}: correct answer for '{key}' not among choices")
        if f"({list(self.choices)[0]})" not in self.passage:
            raise ValueError(f"{self.id}: passage missing blank marker(s)")
        return self


class SentenceEquivalenceQuestion(QuestionBase):
    section: Literal["verbal"] = "verbal"
    qtype: Literal["sentence_equivalence"] = "sentence_equivalence"
    sentence: str
    choices: list[str]  # exactly 6 options
    correct: list[str]  # exactly 2, both producing equivalent meaning

    @model_validator(mode="after")
    def _check_choices(self):
        if len(self.choices) != 6:
            raise ValueError(f"{self.id}: sentence equivalence requires exactly 6 choices")
        if len(self.correct) != 2:
            raise ValueError(f"{self.id}: sentence equivalence requires exactly 2 correct answers")
        if not set(self.correct).issubset(self.choices):
            raise ValueError(f"{self.id}: correct answers must be among choices")
        return self


class ReadingComprehensionQuestion(QuestionBase):
    section: Literal["verbal"] = "verbal"
    qtype: Literal["reading_comprehension"] = "reading_comprehension"
    passage_id: str
    question: str
    choices: list[str]
    correct: list[str]
    select_all: bool = False

    @model_validator(mode="after")
    def _check_answers(self):
        if not self.select_all and len(self.correct) != 1:
            raise ValueError(f"{self.id}: single-answer RC question must have exactly 1 correct choice")
        if not set(self.correct).issubset(self.choices):
            raise ValueError(f"{self.id}: correct answers must be among choices")
        return self


class Passage(BaseModel):
    id: str
    title: str
    text: str
    source: Literal["original", "public_domain"] = "original"


class QuantComparisonQuestion(QuestionBase):
    section: Literal["quant"] = "quant"
    qtype: Literal["quant_comparison"] = "quant_comparison"
    quantity_a: str
    quantity_b: str
    shared_info: Optional[str] = None
    correct: Literal["A", "B", "equal", "cannot_determine"]


class QuantMultipleChoiceQuestion(QuestionBase):
    section: Literal["quant"] = "quant"
    qtype: Literal["quant_multiple_choice"] = "quant_multiple_choice"
    prompt: str
    choices: list[str]
    correct: list[str]
    select_all: bool = False

    @model_validator(mode="after")
    def _check_answers(self):
        if not self.select_all and len(self.correct) != 1:
            raise ValueError(f"{self.id}: single-answer MC question must have exactly 1 correct choice")
        if not set(self.correct).issubset(self.choices):
            raise ValueError(f"{self.id}: correct answers must be among choices")
        return self


class QuantNumericEntryQuestion(QuestionBase):
    section: Literal["quant"] = "quant"
    qtype: Literal["quant_numeric_entry"] = "quant_numeric_entry"
    prompt: str
    correct: str  # numeric string; may be a fraction like "3/4"


VERBAL_MODELS = {
    "text_completion": TextCompletionQuestion,
    "sentence_equivalence": SentenceEquivalenceQuestion,
    "reading_comprehension": ReadingComprehensionQuestion,
}

QUANT_MODELS = {
    "quant_comparison": QuantComparisonQuestion,
    "quant_multiple_choice": QuantMultipleChoiceQuestion,
    "quant_numeric_entry": QuantNumericEntryQuestion,
}
