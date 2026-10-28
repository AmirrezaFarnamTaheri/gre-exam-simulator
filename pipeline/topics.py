"""Quant topic taxonomy.

This mirrors ETS's official GRE Quantitative Reasoning content specification
(the same four content areas the Khan Academy/ETS prep videos are organized
around: Arithmetic, Algebra, Geometry, Data Analysis) rather than anything
scraped from Khan Academy directly -- their site is JS-heavy, ToS-restricted,
and not a reliable scrape target. Use this as the skill-tag vocabulary for
`topic` fields in seed_quant.py and any future generated questions.
"""

QUANT_TOPICS = {
    "arithmetic": [
        "integers_and_divisibility",
        "fractions_decimals_percents",
        "ratios_and_rates",
        "exponents_and_roots",
        "absolute_value_and_number_line",
        "order_of_operations",
        "estimation",
    ],
    "algebra": [
        "linear_equations_and_inequalities",
        "quadratic_equations",
        "functions",
        "coordinate_geometry_lines",
        "algebraic_expressions",
        "word_problems",
    ],
    "geometry": [
        "lines_and_angles",
        "triangles",
        "quadrilaterals_and_polygons",
        "circles",
        "area_perimeter_volume",
        "coordinate_geometry_shapes",
        "pythagorean_theorem",
    ],
    "data_analysis": [
        "descriptive_statistics",
        "data_interpretation",
        "probability",
        "counting_methods",
        "distributions",
    ],
}
