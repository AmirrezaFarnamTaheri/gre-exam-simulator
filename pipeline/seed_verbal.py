"""Hand-authored verbal seed questions: text completion, sentence equivalence,
and reading comprehension. All original content, validated against schema.py.
"""

from .schema import (
    ReadingComprehensionQuestion,
    SentenceEquivalenceQuestion,
    TextCompletionQuestion,
)

TEXT_COMPLETION = [
    TextCompletionQuestion(
        id="v-tc-01",
        topic="text_completion_single_blank",
        difficulty=2,
        passage=(
            "Despite the committee's early enthusiasm, the project was eventually "
            "deemed too costly, and funding was (i)______."
        ),
        choices={"i": ["withdrawn", "increased", "publicized"]},
        correct={"i": "withdrawn"},
        explanation="\"too costly\" signals a negative outcome, so funding was cut/withdrawn.",
    ),
    TextCompletionQuestion(
        id="v-tc-02",
        topic="text_completion_single_blank",
        difficulty=3,
        passage=(
            "The professor's lectures were so (i)______ that students frequently fell "
            "asleep before the halfway point."
        ),
        choices={"i": ["soporific", "riveting", "controversial"]},
        correct={"i": "soporific"},
        explanation="Falling asleep signals a sleep-inducing (soporific) lecture.",
    ),
    TextCompletionQuestion(
        id="v-tc-03",
        topic="text_completion_double_blank",
        difficulty=4,
        passage=(
            "Although the senator's speech appeared (i)______ on the surface, careful "
            "analysis revealed it to be a (ii)______ attempt to avoid committing to any "
            "specific policy."
        ),
        choices={
            "i": ["substantive", "brief", "humorous"],
            "ii": ["calculated", "spontaneous", "sincere"],
        },
        correct={"i": "substantive", "ii": "calculated"},
        explanation=(
            "\"Although\" signals contrast: it looked substantive but was actually a "
            "calculated dodge."
        ),
    ),
    TextCompletionQuestion(
        id="v-tc-04",
        topic="text_completion_double_blank",
        difficulty=3,
        passage=(
            "The novelist's prose was widely praised for being (i)______, conveying "
            "complex emotions through simple, unadorned sentences, though some critics "
            "found this very (ii)______ off-putting."
        ),
        choices={
            "i": ["spare", "verbose", "ornate"],
            "ii": ["austerity", "richness", "ambiguity"],
        },
        correct={"i": "spare", "ii": "austerity"},
        explanation="\"Simple, unadorned\" matches \"spare\"; that spareness is its austerity.",
    ),
    TextCompletionQuestion(
        id="v-tc-05",
        topic="text_completion_single_blank",
        difficulty=2,
        passage=(
            "Because the evidence against the defendant was purely (i)______, the jury "
            "could not convict beyond a reasonable doubt."
        ),
        choices={"i": ["circumstantial", "overwhelming", "irrefutable"]},
        correct={"i": "circumstantial"},
        explanation="Circumstantial evidence alone is often insufficient for conviction.",
    ),
    TextCompletionQuestion(
        id="v-tc-06",
        topic="text_completion_single_blank",
        difficulty=4,
        passage=(
            "Far from being the (i)______ figure his critics portrayed, the diplomat was "
            "in private conversations remarkably self-deprecating and quick to laugh at "
            "his own mistakes."
        ),
        choices={"i": ["pompous", "affable", "reserved"]},
        correct={"i": "pompous"},
        explanation="\"Far from\" plus self-deprecating/humble implies the opposite: pompous.",
    ),
    TextCompletionQuestion(
        id="v-tc-07",
        topic="text_completion_double_blank",
        difficulty=5,
        passage=(
            "The historian's account was neither a (i)______ celebration of the era nor "
            "an unremittingly bleak indictment of it, but rather a (ii)______ portrait "
            "that acknowledged both its achievements and its atrocities."
        ),
        choices={
            "i": ["uncritical", "critical", "brief"],
            "ii": ["nuanced", "simplistic", "one-sided"],
        },
        correct={"i": "uncritical", "ii": "nuanced"},
        explanation="\"Neither...nor\" balances an uncritical celebration against a nuanced portrait.",
    ),
    TextCompletionQuestion(
        id="v-tc-08",
        topic="text_completion_single_blank",
        difficulty=3,
        passage=(
            "The company's new policy, intended to streamline operations, instead "
            "introduced so much red tape that efficiency was, paradoxically, (i)______."
        ),
        choices={"i": ["diminished", "enhanced", "unaffected"]},
        correct={"i": "diminished"},
        explanation="\"Paradoxically\" signals the opposite of the intended effect: efficiency fell.",
    ),
]

SENTENCE_EQUIVALENCE = [
    SentenceEquivalenceQuestion(
        id="v-se-01",
        topic="sentence_equivalence",
        difficulty=3,
        sentence=(
            "Her arguments were so ______ that even her staunchest opponents found "
            "themselves nodding in agreement."
        ),
        choices=["persuasive", "compelling", "confusing", "lengthy", "esoteric", "tedious"],
        correct=["persuasive", "compelling"],
        explanation="Both mean convincing, matching opponents being won over.",
    ),
    SentenceEquivalenceQuestion(
        id="v-se-02",
        topic="sentence_equivalence",
        difficulty=2,
        sentence=(
            "Despite his reputation for being ______, he tipped generously and never "
            "haggled over prices."
        ),
        choices=["parsimonious", "stingy", "generous", "punctual", "loyal", "candid"],
        correct=["parsimonious", "stingy"],
        explanation="\"Despite\" signals contrast with generous tipping: reputation for being stingy.",
    ),
    SentenceEquivalenceQuestion(
        id="v-se-03",
        topic="sentence_equivalence",
        difficulty=3,
        sentence=(
            "The critic's review was ______, praising almost nothing about the film's "
            "plot, acting, or pacing."
        ),
        choices=["scathing", "withering", "laudatory", "brief", "ambivalent", "measured"],
        correct=["scathing", "withering"],
        explanation="Praising nothing matches a harshly critical (scathing/withering) review.",
    ),
    SentenceEquivalenceQuestion(
        id="v-se-04",
        topic="sentence_equivalence",
        difficulty=2,
        sentence=(
            "Even the ______ efforts of the rescue team could not save the stranded "
            "hikers before the storm hit."
        ),
        choices=["heroic", "valiant", "half-hearted", "brief", "coordinated", "delayed"],
        correct=["heroic", "valiant"],
        explanation="\"Even the X efforts...could not\" implies X was admirable but still insufficient.",
    ),
    SentenceEquivalenceQuestion(
        id="v-se-05",
        topic="sentence_equivalence",
        difficulty=3,
        sentence=(
            "Because the data were collected using flawed methodology, the study's "
            "conclusions must be regarded as ______."
        ),
        choices=["dubious", "questionable", "definitive", "premature", "compelling", "irrefutable"],
        correct=["dubious", "questionable"],
        explanation="Flawed methodology undermines confidence, matching dubious/questionable.",
    ),
    SentenceEquivalenceQuestion(
        id="v-se-06",
        topic="sentence_equivalence",
        difficulty=2,
        sentence=(
            "The senator's speech was remarkably ______, touching on foreign policy, "
            "healthcare, and education in the span of ten minutes."
        ),
        choices=["wide-ranging", "comprehensive", "narrow", "focused", "concise", "brief"],
        correct=["wide-ranging", "comprehensive"],
        explanation="Touching many topics matches broad in scope: wide-ranging/comprehensive.",
    ),
    SentenceEquivalenceQuestion(
        id="v-se-07",
        topic="sentence_equivalence",
        difficulty=3,
        sentence=(
            "The old bridge was so ______ that engineers feared it might collapse under "
            "even light traffic."
        ),
        choices=["dilapidated", "decrepit", "sturdy", "modern", "ornate", "temporary"],
        correct=["dilapidated", "decrepit"],
        explanation="Fear of collapse matches a rundown, decrepit/dilapidated structure.",
    ),
    SentenceEquivalenceQuestion(
        id="v-se-08",
        topic="sentence_equivalence",
        difficulty=2,
        sentence=(
            "Her explanation of the tax code was surprisingly ______, breaking down "
            "complicated regulations into terms a layperson could easily grasp."
        ),
        choices=["lucid", "clear", "convoluted", "technical", "brief", "biased"],
        correct=["lucid", "clear"],
        explanation="Easy for a layperson to grasp matches a clear, lucid explanation.",
    ),
]

READING_COMPREHENSION = [
    ReadingComprehensionQuestion(
        id="v-rc-01",
        topic="reading_comprehension_main_idea",
        difficulty=3,
        passage_id="p-coral-01",
        question="Which of the following best states the main idea of the passage?",
        choices=[
            "Coral bleaching is caused primarily by overfishing in reef ecosystems.",
            "Coral reefs' outsized biodiversity depends on a heat-sensitive symbiosis that is increasingly disrupted by rising ocean temperatures.",
            "Zooxanthellae algae are more important to marine ecosystems than coral polyps themselves.",
            "Coastal communities are the primary cause of declining coral reef health.",
            "Bleached coral reefs never recover once algae have been expelled.",
        ],
        correct=["Coral reefs' outsized biodiversity depends on a heat-sensitive symbiosis that is increasingly disrupted by rising ocean temperatures."],
        explanation="This is the only choice that captures both the symbiosis and the warming threat central to the passage.",
    ),
    ReadingComprehensionQuestion(
        id="v-rc-02",
        topic="reading_comprehension_detail",
        difficulty=2,
        passage_id="p-coral-01",
        question="According to the passage, a coral reef that has undergone bleaching:",
        choices=[
            "has permanently lost all of its living tissue.",
            "may recover if normal temperatures return quickly enough.",
            "will always recover within one growing season.",
            "was likely never home to zooxanthellae algae.",
            "is unaffected by further temperature increases.",
        ],
        correct=["may recover if normal temperatures return quickly enough."],
        explanation="The passage states bleached coral can recruit new algae and recover if temperatures normalize quickly.",
    ),
    ReadingComprehensionQuestion(
        id="v-rc-03",
        topic="reading_comprehension_detail",
        difficulty=4,
        passage_id="p-coral-01",
        question="The passage suggests which of the following about zooxanthellae algae? Select all that apply.",
        choices=[
            "They live symbiotically within coral tissue.",
            "They provide most of the coral's energy through photosynthesis.",
            "They are expelled by coral during periods of heat stress.",
        ],
        correct=[
            "They live symbiotically within coral tissue.",
            "They provide most of the coral's energy through photosynthesis.",
            "They are expelled by coral during periods of heat stress.",
        ],
        select_all=True,
        explanation="All three are stated directly: they live in coral tissue, supply most of its energy, and are expelled under heat stress.",
    ),
    ReadingComprehensionQuestion(
        id="v-rc-04",
        topic="reading_comprehension_inference",
        difficulty=3,
        passage_id="p-printing-01",
        question="The passage implies that before the invention of the printing press:",
        choices=[
            "no books existed in Europe.",
            "literacy was largely restricted to a small segment of society.",
            "the Protestant Reformation had already occurred.",
            "spelling and grammar were already standardized across Europe.",
            "print shops were common in most European cities.",
        ],
        correct=["literacy was largely restricted to a small segment of society."],
        explanation="The passage says hand-copied books \"confined literacy and scholarship largely to monasteries, courts, and the wealthy.\"",
    ),
    ReadingComprehensionQuestion(
        id="v-rc-05",
        topic="reading_comprehension_detail",
        difficulty=2,
        passage_id="p-printing-01",
        question="Which of the following is cited in the passage as a consequence of the printing press's introduction?",
        choices=[
            "The complete elimination of hand-copied manuscripts.",
            "The standardization of spelling and grammar across regions.",
            "The invention of movable type by monastery scribes.",
            "A decrease in the number of European print shops.",
            "The end of the Protestant Reformation.",
        ],
        correct=["The standardization of spelling and grammar across regions."],
        explanation="The passage explicitly lists standardized spelling and grammar as a consequence.",
    ),
    ReadingComprehensionQuestion(
        id="v-rc-06",
        topic="reading_comprehension_rhetorical_purpose",
        difficulty=4,
        passage_id="p-printing-01",
        question="The author's comparison to the internet in the final sentence primarily serves to:",
        choices=[
            "argue that the internet is a more powerful tool for spreading information than the printing press was.",
            "suggest a modern point of comparison for the scale of the printing press's impact on the spread of ideas.",
            "criticize modern historians for overstating the importance of the printing press.",
            "prove that digital technology has made printed books obsolete.",
            "demonstrate that the internet was directly inspired by Gutenberg's invention.",
        ],
        correct=["suggest a modern point of comparison for the scale of the printing press's impact on the spread of ideas."],
        explanation="The sentence uses the internet as a relatable scale comparison, not an argument about which is \"better.\"",
    ),
]

ALL_VERBAL_QUESTIONS = TEXT_COMPLETION + SENTENCE_EQUIVALENCE + READING_COMPREHENSION
