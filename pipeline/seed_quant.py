"""Hand-authored quant seed questions across the four ETS GRE content areas
(see topics.py). Every numeric answer below has been worked out by hand and
double-checked; the (verified) tag in `tags` marks that.
"""

from .schema import QuantComparisonQuestion, QuantMultipleChoiceQuestion, QuantNumericEntryQuestion

ARITHMETIC = [
    QuantComparisonQuestion(
        id="q-ar-01",
        topic="exponents_and_roots",
        difficulty=2,
        shared_info="x > 0",
        quantity_a="x^2",
        quantity_b="x^3",
        correct="cannot_determine",
        explanation="If 0<x<1, x^2>x^3; if x>1, x^2<x^3; if x=1, they're equal. No single relationship holds.",
        tags=["verified"],
    ),
    QuantNumericEntryQuestion(
        id="q-ar-02",
        topic="fractions_decimals_percents",
        difficulty=2,
        prompt="What is 15% of 240?",
        correct="36",
        explanation="0.15 * 240 = 36.",
        tags=["verified"],
    ),
    QuantMultipleChoiceQuestion(
        id="q-ar-03",
        topic="fractions_decimals_percents",
        difficulty=3,
        prompt=(
            "A store marks up the wholesale price of an item by 40% and then offers a "
            "25% discount on the marked-up price. What is the net percent change from "
            "the original wholesale price?"
        ),
        choices=["+5%", "+15%", "+35%", "-5%", "+65%"],
        correct=["+5%"],
        explanation="1.40 * 0.75 = 1.05, a net increase of 5% over the original wholesale price.",
        tags=["verified"],
    ),
    QuantComparisonQuestion(
        id="q-ar-04",
        topic="integers_and_divisibility",
        difficulty=3,
        quantity_a="The remainder when 47 is divided by 6",
        quantity_b="The remainder when 83 is divided by 9",
        correct="A",
        explanation="47 = 6*7 + 5, remainder 5. 83 = 9*9 + 2, remainder 2. 5 > 2.",
        tags=["verified"],
    ),
]

ALGEBRA = [
    QuantNumericEntryQuestion(
        id="q-al-01",
        topic="linear_equations_and_inequalities",
        difficulty=2,
        prompt="If 3x - 7 = 2x + 5, what is the value of x?",
        correct="12",
        explanation="3x - 7 = 2x + 5 -> x = 12.",
        tags=["verified"],
    ),
    QuantComparisonQuestion(
        id="q-al-02",
        topic="quadratic_equations",
        difficulty=4,
        shared_info="x^2 - 5x + 6 = 0",
        quantity_a="x",
        quantity_b="3",
        correct="cannot_determine",
        explanation="(x-2)(x-3)=0, so x=2 or x=3. Quantity A could be less than or equal to Quantity B.",
        tags=["verified"],
    ),
    QuantMultipleChoiceQuestion(
        id="q-al-03",
        topic="functions",
        difficulty=4,
        prompt="If f(x) = 2x^2 - 3x + 1, what is f(-2)?",
        choices=["9", "11", "15", "17", "23"],
        correct=["15"],
        explanation="f(-2) = 2(4) - 3(-2) + 1 = 8 + 6 + 1 = 15.",
        tags=["verified"],
    ),
    QuantNumericEntryQuestion(
        id="q-al-04",
        topic="linear_equations_and_inequalities",
        difficulty=3,
        prompt="If 4(x + 3) = 2(x + 9), what is the value of x?",
        correct="3",
        explanation="4x + 12 = 2x + 18 -> 2x = 6 -> x = 3.",
        tags=["verified"],
    ),
]

GEOMETRY = [
    QuantMultipleChoiceQuestion(
        id="q-ge-01",
        topic="quadrilaterals_and_polygons",
        difficulty=3,
        prompt=(
            "A rectangle has a length that is 3 more than twice its width. If the "
            "perimeter of the rectangle is 36, what is the width?"
        ),
        choices=["4", "5", "6", "7", "9"],
        correct=["5"],
        explanation="l=2w+3; perimeter 2(l+w)=2(3w+3)=6w+6=36 -> w=5.",
        tags=["verified"],
    ),
    QuantComparisonQuestion(
        id="q-ge-02",
        topic="circles",
        difficulty=3,
        shared_info="A circle has a circumference of 10*pi.",
        quantity_a="The area of the circle",
        quantity_b="78",
        correct="A",
        explanation="Circumference 2*pi*r=10*pi -> r=5. Area = pi*25 ≈ 78.54 > 78.",
        tags=["verified"],
    ),
    QuantNumericEntryQuestion(
        id="q-ge-03",
        topic="pythagorean_theorem",
        difficulty=4,
        prompt="In a right triangle, the two legs have lengths 9 and 12. What is the length of the hypotenuse?",
        correct="15",
        explanation="sqrt(9^2 + 12^2) = sqrt(81+144) = sqrt(225) = 15.",
        tags=["verified"],
    ),
    QuantMultipleChoiceQuestion(
        id="q-ge-04",
        topic="area_perimeter_volume",
        difficulty=4,
        prompt="The volume of a cube is 64. What is the surface area of the cube?",
        choices=["16", "24", "64", "96", "144"],
        correct=["96"],
        explanation="side^3=64 -> side=4. Surface area = 6*4^2 = 96.",
        tags=["verified"],
    ),
]

DATA_ANALYSIS = [
    QuantMultipleChoiceQuestion(
        id="q-da-01",
        topic="descriptive_statistics",
        difficulty=2,
        prompt=(
            "The mean of five numbers is 20. If one of the numbers is removed, the mean "
            "of the remaining four numbers is 18. What was the value of the removed "
            "number?"
        ),
        choices=["18", "20", "24", "28", "32"],
        correct=["28"],
        explanation="Sum of 5 = 100; sum of remaining 4 = 72; removed = 100 - 72 = 28.",
        tags=["verified"],
    ),
    QuantComparisonQuestion(
        id="q-da-02",
        topic="probability",
        difficulty=3,
        shared_info="A jar contains 4 red marbles and 6 blue marbles. One marble is drawn at random.",
        quantity_a="The probability the marble is red",
        quantity_b="2/5",
        correct="equal",
        explanation="P(red) = 4/10 = 2/5, equal to Quantity B.",
        tags=["verified"],
    ),
    QuantNumericEntryQuestion(
        id="q-da-03",
        topic="counting_methods",
        difficulty=4,
        prompt="A committee of 3 people is to be chosen from a group of 7 people. How many different committees are possible?",
        correct="35",
        explanation="C(7,3) = 7!/(3!4!) = 35.",
        tags=["verified"],
    ),
    QuantMultipleChoiceQuestion(
        id="q-da-04",
        topic="descriptive_statistics",
        difficulty=3,
        prompt="The following are 7 test scores: 62, 74, 74, 81, 88, 91, 95. What is the median score?",
        choices=["74", "78", "81", "88", "91"],
        correct=["81"],
        explanation="Sorted, the middle (4th of 7) value is 81.",
        tags=["verified"],
    ),
]

ALL_QUANT_QUESTIONS = ARITHMETIC + ALGEBRA + GEOMETRY + DATA_ANALYSIS
