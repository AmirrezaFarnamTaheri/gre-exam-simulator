"""GRE-frequency vocabulary list, tiered by difficulty (1=easier, 3=harder).

Used as the source pool for text completion / sentence equivalence distractors
and for a standalone flashcard/vocab-drill mode in the app.
"""

VOCAB = [
    # Tier 1
    {"word": "ambiguous", "pos": "adj", "tier": 1, "definition": "open to more than one interpretation"},
    {"word": "benevolent", "pos": "adj", "tier": 1, "definition": "well-meaning and kindly"},
    {"word": "candid", "pos": "adj", "tier": 1, "definition": "truthful and straightforward"},
    {"word": "diligent", "pos": "adj", "tier": 1, "definition": "showing care and effort in one's work"},
    {"word": "eloquent", "pos": "adj", "tier": 1, "definition": "fluent and persuasive in speaking or writing"},
    {"word": "frugal", "pos": "adj", "tier": 1, "definition": "economical, sparing with money or resources"},
    {"word": "hostile", "pos": "adj", "tier": 1, "definition": "antagonistic, unfriendly"},
    {"word": "impartial", "pos": "adj", "tier": 1, "definition": "treating all sides or views equally"},
    {"word": "meticulous", "pos": "adj", "tier": 1, "definition": "showing great attention to detail"},
    {"word": "notorious", "pos": "adj", "tier": 1, "definition": "famous or well-known for something bad"},
    # Tier 2
    {"word": "ambivalent", "pos": "adj", "tier": 2, "definition": "having mixed or contradictory feelings"},
    {"word": "capricious", "pos": "adj", "tier": 2, "definition": "given to sudden, unaccountable changes of mood"},
    {"word": "cogent", "pos": "adj", "tier": 2, "definition": "clear, logical, and convincing"},
    {"word": "deleterious", "pos": "adj", "tier": 2, "definition": "causing harm or damage"},
    {"word": "ephemeral", "pos": "adj", "tier": 2, "definition": "lasting a very short time"},
    {"word": "equivocate", "pos": "v", "tier": 2, "definition": "use ambiguous language to conceal the truth"},
    {"word": "garrulous", "pos": "adj", "tier": 2, "definition": "excessively talkative"},
    {"word": "indolent", "pos": "adj", "tier": 2, "definition": "lazy, avoiding activity or exertion"},
    {"word": "mercurial", "pos": "adj", "tier": 2, "definition": "subject to sudden, unpredictable changes"},
    {"word": "obstinate", "pos": "adj", "tier": 2, "definition": "stubbornly refusing to change one's mind"},
    {"word": "parsimonious", "pos": "adj", "tier": 2, "definition": "unwilling to spend money; stingy"},
    {"word": "placate", "pos": "v", "tier": 2, "definition": "make someone less angry or hostile"},
    {"word": "reticent", "pos": "adj", "tier": 2, "definition": "reserved, reluctant to speak"},
    {"word": "sanguine", "pos": "adj", "tier": 2, "definition": "optimistic, especially in a difficult situation"},
    {"word": "taciturn", "pos": "adj", "tier": 2, "definition": "reserved, saying little"},
    {"word": "tenuous", "pos": "adj", "tier": 2, "definition": "very weak or slight"},
    {"word": "ubiquitous", "pos": "adj", "tier": 2, "definition": "present, appearing, or found everywhere"},
    # Tier 3
    {"word": "abstruse", "pos": "adj", "tier": 3, "definition": "difficult to understand"},
    {"word": "ameliorate", "pos": "v", "tier": 3, "definition": "make a bad situation better"},
    {"word": "assiduous", "pos": "adj", "tier": 3, "definition": "showing great care and perseverance"},
    {"word": "ersatz", "pos": "adj", "tier": 3, "definition": "an artificial substitute, typically inferior"},
    {"word": "fastidious", "pos": "adj", "tier": 3, "definition": "very attentive to detail; hard to please"},
    {"word": "iconoclast", "pos": "n", "tier": 3, "definition": "one who attacks cherished beliefs or institutions"},
    {"word": "inexorable", "pos": "adj", "tier": 3, "definition": "impossible to stop or prevent"},
    {"word": "laconic", "pos": "adj", "tier": 3, "definition": "using very few words"},
    {"word": "obfuscate", "pos": "v", "tier": 3, "definition": "render obscure, unclear, or unintelligible"},
    {"word": "obsequious", "pos": "adj", "tier": 3, "definition": "excessively eager to please or obey"},
    {"word": "parochial", "pos": "adj", "tier": 3, "definition": "narrow in scope or outlook; limited"},
    {"word": "perfidious", "pos": "adj", "tier": 3, "definition": "deceitful and untrustworthy"},
    {"word": "perfunctory", "pos": "adj", "tier": 3, "definition": "carried out with minimum effort or reflection"},
    {"word": "pernicious", "pos": "adj", "tier": 3, "definition": "having a harmful effect, especially gradually"},
    {"word": "prodigal", "pos": "adj", "tier": 3, "definition": "wastefully extravagant"},
    {"word": "quixotic", "pos": "adj", "tier": 3, "definition": "unrealistically idealistic"},
    {"word": "recalcitrant", "pos": "adj", "tier": 3, "definition": "stubbornly disobedient or resistant"},
    {"word": "sycophant", "pos": "n", "tier": 3, "definition": "a person who acts obsequiously toward someone important"},
    {"word": "truculent", "pos": "adj", "tier": 3, "definition": "eager to argue or fight; aggressively defiant"},
]
