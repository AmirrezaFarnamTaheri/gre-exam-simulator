"""Original reading-comprehension passages (written for this project, not
copied from any test-prep source) so RC content carries no copyright risk."""

from .schema import Passage

PASSAGES = [
    Passage(
        id="p-coral-01",
        title="Coral Bleaching",
        source="original",
        text=(
            "Coral reefs, though they occupy less than one percent of the ocean floor, "
            "support an estimated quarter of all marine species. This disproportionate "
            "biodiversity arises from a symbiotic relationship between coral polyps and "
            "photosynthetic algae called zooxanthellae, which live within the coral's "
            "tissues and supply it with the majority of its energy. When ocean "
            "temperatures rise even slightly above their normal range for a sustained "
            "period, corals expel these algae in a stress response known as bleaching, "
            "leaving behind a white, nutrient-starved skeleton. A bleached coral is not "
            "immediately dead; if temperatures return to normal quickly enough, the coral "
            "can recruit new algae and recover. However, repeated or prolonged bleaching "
            "events, now increasingly common as global sea temperatures climb, leave "
            "reefs progressively less able to rebound, threatening not only marine "
            "biodiversity but the coastal communities that depend on reefs for fisheries "
            "and storm protection."
        ),
    ),
    Passage(
        id="p-printing-01",
        title="The Printing Press and the Economics of Information",
        source="original",
        text=(
            "When Johannes Gutenberg introduced movable-type printing to Europe in the "
            "mid-fifteenth century, he did more than mechanize the reproduction of text; "
            "he fundamentally altered the economics of information. Prior to Gutenberg's "
            "press, books were copied by hand, a slow and expensive process that confined "
            "literacy and scholarship largely to monasteries, courts, and the wealthy. "
            "Within decades of the press's introduction, the cost of producing a book fell "
            "dramatically, and print shops sprang up across European cities. This sudden "
            "abundance of printed material did not merely spread existing ideas faster; it "
            "also standardized spelling and grammar across regions, fueled the Protestant "
            "Reformation by allowing pamphlets and translated scripture to circulate "
            "widely, and created, for the first time, a genuine mass reading public. Some "
            "historians argue that the printing press was as consequential to the spread "
            "of ideas as the internet has been in more recent times."
        ),
    ),
]
