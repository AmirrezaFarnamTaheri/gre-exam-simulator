const fs = require('fs');
const path = require('path');

const quantDir = path.join(__dirname, '../data/questions/quant');
const verbalDir = path.join(__dirname, '../data/questions/verbal');

// 1. New Geometry questions
const newGeometry = [
  {
    id: "q-ge-05",
    section: "quant",
    qtype: "quant_comparison",
    topic: "circles",
    difficulty: 3,
    explanation: "Triangle inscribed in semicircle with diameter as hypotenuse has ∠C = 90°. Since BC = 6 and AB = 10, AC = sqrt(10^2 - 6^2) = 8. Area = (1/2)*6*8 = 24. Quantity A is 24, Quantity B is 24, so they are equal.",
    source: "seed",
    tags: ["verified", "inscribed_triangle"],
    quantity_a: "The area of triangle ABC",
    quantity_b: "24",
    shared_info: "Points A, B, and C lie on a circle with diameter AB = 10. Chord BC has length 6.",
    correct: "equal"
  },
  {
    id: "q-ge-06",
    section: "quant",
    qtype: "quant_multiple_choice",
    topic: "circles",
    difficulty: 4,
    explanation: "Area of sector = (theta/360) * pi * r^2. 6*pi = (60/360) * pi * r^2 = (1/6)*pi*r^2. So r^2 = 36 -> r = 6. Circumference = 2*pi*r = 12*pi.",
    source: "seed",
    tags: ["verified", "sectors"],
    prompt: "In a circle with center O, central angle AOB measures 60 degrees. If the area of sector AOB is 6π, what is the circumference of the circle?",
    choices: ["6π", "12π", "18π", "24π", "36π"],
    correct: ["12π"],
    select_all: false
  },
  {
    id: "q-ge-07",
    section: "quant",
    qtype: "quant_comparison",
    topic: "circles",
    difficulty: 4,
    explanation: "Concentric circles with radius 5 and 3. Shaded region (annulus) has area pi*(5^2 - 3^2) = 16*pi. 16*pi ≈ 50.27, which is greater than 50.",
    source: "seed",
    tags: ["verified", "annulus"],
    quantity_a: "The area of the region between circle C1 and circle C2",
    quantity_b: "50",
    shared_info: "Circle C1 has radius 5, and circle C2 has radius 3. Both circles share the same center.",
    correct: "A"
  },
  {
    id: "q-ge-08",
    section: "quant",
    qtype: "quant_numeric_entry",
    topic: "area_perimeter_volume",
    difficulty: 3,
    explanation: "Volume of cylinder = pi * r^2 * h. Here r = 4 and h = 10, so V = pi * 16 * 10 = 160*pi. The question asks for V/pi, which is 160.",
    source: "seed",
    tags: ["verified", "cylinder"],
    prompt: "A right circular cylinder has a base radius of 4 and a height of 10. If the volume of the cylinder is kπ, what is the value of k?",
    correct: "160"
  },
  {
    id: "q-ge-09",
    section: "quant",
    qtype: "quant_multiple_choice",
    topic: "area_perimeter_volume",
    difficulty: 4,
    explanation: "The space diagonal of a rectangular solid is d = sqrt(l^2 + w^2 + h^2) = sqrt(3^2 + 4^2 + 12^2) = sqrt(9 + 16 + 144) = sqrt(169) = 13.",
    source: "seed",
    tags: ["verified", "3d_geometry"],
    prompt: "A rectangular box has length 3, width 4, and height 12. What is the length of the longest line segment that can be drawn between two vertices of the box?",
    choices: ["11", "12", "13", "15", "19"],
    correct: ["13"],
    select_all: false
  },
  {
    id: "q-ge-10",
    section: "quant",
    qtype: "quant_comparison",
    topic: "pythagorean_theorem",
    difficulty: 3,
    explanation: "By triangle inequality, the third side x must satisfy |7 - 4| < x < 7 + 4, meaning 3 < x < 11. x could be 4 (less than 8) or 10 (greater than 8). Thus the relationship cannot be determined.",
    source: "seed",
    tags: ["verified", "triangle_inequality"],
    quantity_a: "The length of the third side of the triangle",
    quantity_b: "8",
    shared_info: "Two sides of a triangle have lengths 4 and 7.",
    correct: "cannot_determine"
  },
  {
    id: "q-ge-11",
    section: "quant",
    qtype: "quant_multiple_choice",
    topic: "quadrilaterals_and_polygons",
    difficulty: 3,
    explanation: "The sum of interior angles of an n-sided polygon is (n - 2) * 180. For a hexagon, n = 6, so sum = 4 * 180 = 720 degrees. For a regular hexagon, each interior angle is 720 / 6 = 120 degrees.",
    source: "seed",
    tags: ["verified", "polygon_angles"],
    prompt: "What is the measure, in degrees, of each interior angle of a regular hexagon?",
    choices: ["108°", "120°", "135°", "140°", "144°"],
    correct: ["120°"],
    select_all: false
  },
  {
    id: "q-ge-12",
    section: "quant",
    qtype: "quant_comparison",
    topic: "area_perimeter_volume",
    difficulty: 4,
    explanation: "For a fixed perimeter P, the rectangle with maximum area is a square. A square with perimeter 40 has side 10 and area 100. Any non-square rectangle with perimeter 40 has area strictly less than 100. Since we are told the rectangle is not a square, area < 100. Thus Quantity B is greater.",
    source: "seed",
    tags: ["verified", "optimization"],
    quantity_a: "The area of rectangle R",
    quantity_b: "100",
    shared_info: "Rectangle R has a perimeter of 40 and is not a square.",
    correct: "B"
  }
];

// 2. New Algebra questions
const newAlgebra = [
  {
    id: "q-al-05",
    section: "quant",
    qtype: "quant_multiple_choice",
    topic: "functions",
    difficulty: 3,
    explanation: "g(-2) = (-2)^2 + 1 = 4 + 1 = 5. Then f(g(-2)) = f(5) = 2(5) - 3 = 10 - 3 = 7.",
    source: "seed",
    tags: ["verified", "composite_function"],
    prompt: "Let f(x) = 2x - 3 and g(x) = x^2 + 1. What is the value of f(g(-2))?",
    choices: ["3", "5", "7", "9", "11"],
    correct: ["7"],
    select_all: false
  },
  {
    id: "q-al-06",
    section: "quant",
    qtype: "quant_comparison",
    topic: "functions",
    difficulty: 4,
    explanation: "f(a) = a^2 - 4a + 7 = (a - 2)^2 + 3. Since (a - 2)^2 >= 0 for all real a, the minimum value of f(a) is 3, achieved when a = 2. For any other real number, f(a) > 3. Therefore, f(a) >= 3 for all real a. Thus Quantity A is greater than or equal to Quantity B, but can equal 3. Thus cannot determine whether A > B or A = B.",
    source: "seed",
    tags: ["verified", "parabola_vertex"],
    quantity_a: "f(a)",
    quantity_b: "3",
    shared_info: "The function f is defined by f(x) = x^2 - 4x + 7 for all real numbers x, and a is a real number.",
    correct: "cannot_determine"
  },
  {
    id: "q-al-07",
    section: "quant",
    qtype: "quant_numeric_entry",
    topic: "functions",
    difficulty: 3,
    explanation: "3 * 5 = (3*5)/(3 + 5) = 15/8. (15/8) * 2 = ((15/8)*2)/((15/8) + 2) = (15/4)/(31/8) = (15/4)*(8/31) = 30/31.",
    source: "seed",
    tags: ["verified", "custom_operation"],
    prompt: "For all positive numbers a and b, let a * b = (ab)/(a + b). If 4 * k = 2, what is the value of k?",
    correct: "4"
  },
  {
    id: "q-al-08",
    section: "quant",
    qtype: "quant_comparison",
    topic: "exponents_and_roots",
    difficulty: 4,
    explanation: "2^20 - 2^18 = 2^18 * (2^2 - 1) = 2^18 * 3. So (2^20 - 2^18)/3 = 2^18. Quantity A is 2^18 and Quantity B is 2^18, so they are equal.",
    source: "seed",
    tags: ["verified", "factoring_exponents"],
    quantity_a: "(2^20 - 2^18) / 3",
    quantity_b: "2^18",
    correct: "equal"
  },
  {
    id: "q-al-09",
    section: "quant",
    qtype: "quant_multiple_choice",
    topic: "linear_equations_and_inequalities",
    difficulty: 3,
    explanation: "|2x - 5| <= 7 means -7 <= 2x - 5 <= 7. Adding 5 gives -2 <= 2x <= 12. Dividing by 2 gives -1 <= x <= 6. The integer solutions are -1, 0, 1, 2, 3, 4, 5, 6, which is 8 integers.",
    source: "seed",
    tags: ["verified", "absolute_value"],
    prompt: "How many integers satisfy the inequality |2x - 5| ≤ 7?",
    choices: ["6", "7", "8", "9", "10"],
    correct: ["8"],
    select_all: false
  },
  {
    id: "q-al-10",
    section: "quant",
    qtype: "quant_comparison",
    topic: "quadratic_equations",
    difficulty: 4,
    explanation: "x^2 - 5x + 6 = 0 factors to (x - 2)(x - 3) = 0, so x = 2 or x = 3. y^2 - 7y + 12 = 0 factors to (y - 3)(y - 4) = 0, so y = 3 or y = 4. If x = 3 and y = 3, x = y. If x = 2 and y = 4, x < y. Therefore the relationship cannot be determined.",
    source: "seed",
    tags: ["verified", "quadratic_roots"],
    quantity_a: "x",
    quantity_b: "y",
    shared_info: "x^2 - 5x + 6 = 0 and y^2 - 7y + 12 = 0.",
    correct: "cannot_determine"
  }
];

// 3. New Arithmetic questions
const newArithmetic = [
  {
    id: "q-ar-05",
    section: "quant",
    qtype: "quant_multiple_choice",
    topic: "fractions_decimals_percents",
    difficulty: 3,
    explanation: "Let original price be P. After 20% increase, price is 1.20P. After 20% decrease, price is 1.20P * 0.80 = 0.96P. This represents a 4% decrease from P.",
    source: "seed",
    tags: ["verified", "percentage_change"],
    prompt: "The price of an item was increased by 20%, and then the new price was decreased by 20%. The final price is what percent of the original price?",
    choices: ["96%", "98%", "100%", "102%", "104%"],
    correct: ["96%"],
    select_all: false
  },
  {
    id: "q-ar-06",
    section: "quant",
    qtype: "quant_comparison",
    topic: "integers_and_divisibility",
    difficulty: 4,
    explanation: "Powers of 7 mod 5: 7^1 = 7 ≡ 2, 7^2 = 49 ≡ 4, 7^3 = 343 ≡ 3, 7^4 = 2401 ≡ 1. The cycle of remainders is 2, 4, 3, 1 with period 4. 45 = 4*11 + 1, so 7^45 has the same remainder as 7^1, which is 2. Quantity A is 2, Quantity B is 2. The quantities are equal.",
    source: "seed",
    tags: ["verified", "modulo_arithmetic"],
    quantity_a: "The remainder when 7^45 is divided by 5",
    quantity_b: "2",
    correct: "equal"
  },
  {
    id: "q-ar-07",
    section: "quant",
    qtype: "quant_numeric_entry",
    topic: "fractions_decimals_percents",
    difficulty: 3,
    explanation: "Rate of A = 1/6 jobs/hr. Rate of B = 1/9 jobs/hr. Together in 2 hours they do 2*(1/6 + 1/9) = 2*(5/18) = 10/18 = 5/9 of the job. Remaining work = 4/9. Machine B alone takes (4/9) / (1/9) = 4 hours. Starting at 11:00 AM + 4 hours gives 3:00 PM.",
    source: "seed",
    tags: ["verified", "work_rate"],
    prompt: "Machine A finishes a batch in 6 hours, while Machine B finishes the same batch in 9 hours. Both start at 9:00 AM. At 11:00 AM, Machine A stops, and Machine B finishes alone. How many hours did Machine B work alone?",
    correct: "4"
  },
  {
    id: "q-ar-08",
    section: "quant",
    qtype: "quant_comparison",
    topic: "integers_and_divisibility",
    difficulty: 4,
    explanation: "n is divisible by both 6 and 9, so n is a multiple of lcm(6, 9) = 18. The multiples of 18 are 18, 36, 54, ... all of which are divisible by 18, but not necessarily by 54 (e.g. 18 or 36 is not). Quantity A is the remainder when n is divided by 18, which is 0. Quantity B is 0. They are equal.",
    source: "seed",
    tags: ["verified", "lcm_divisibility"],
    quantity_a: "The remainder when n is divided by 18",
    quantity_b: "0",
    shared_info: "n is a positive integer divisible by both 6 and 9.",
    correct: "equal"
  }
];

// 4. New Data Analysis questions
const newDataAnalysis = [
  {
    id: "q-da-05",
    section: "quant",
    qtype: "quant_multiple_choice",
    topic: "counting_methods",
    difficulty: 4,
    explanation: "Number of ways to choose 3 people from 8 is C(8, 3) = (8*7*6)/(3*2*1) = 56. Committees with NO women (only men) = C(5, 3) = (5*4*3)/(3*2*1) = 10. Committees with at least one woman = 56 - 10 = 46.",
    source: "seed",
    tags: ["verified", "combinations"],
    prompt: "A committee of 3 people is to be selected from a group of 5 men and 3 women. How many different committees can be formed that include at least one woman?",
    choices: ["30", "36", "40", "46", "56"],
    correct: ["46"],
    select_all: false
  },
  {
    id: "q-da-06",
    section: "quant",
    qtype: "quant_comparison",
    topic: "descriptive_statistics",
    difficulty: 3,
    explanation: "Set S original: mean = (10+20+30+40+50)/5 = 30. If 100 is added, new mean is (150+100)/6 = 250/6 ≈ 41.67. Median of original set is 30. Median of new set {10, 20, 30, 40, 50, 100} is (30+40)/2 = 35. The mean increased by ~11.67, while the median increased by only 5. Thus Quantity A is greater.",
    source: "seed",
    tags: ["verified", "mean_vs_median"],
    quantity_a: "The increase in the mean of Set S",
    quantity_b: "The increase in the median of Set S",
    shared_info: "Set S initially contains the integers {10, 20, 30, 40, 50}. The number 100 is then added to Set S.",
    correct: "A"
  },
  {
    id: "q-da-07",
    section: "quant",
    qtype: "quant_multiple_choice",
    topic: "probability",
    difficulty: 4,
    explanation: "Probability of NO heads in 4 flips is (1/2)^4 = 1/16. Probability of at least one head = 1 - 1/16 = 15/16.",
    source: "seed",
    tags: ["verified", "complementary_probability"],
    prompt: "A fair coin is tossed 4 times. What is the probability that at least one head turns up?",
    choices: ["1/16", "7/16", "1/2", "15/16", "1"],
    correct: ["15/16"],
    select_all: false
  },
  {
    id: "q-da-08",
    section: "quant",
    qtype: "quant_numeric_entry",
    topic: "descriptive_statistics",
    difficulty: 3,
    explanation: "Total students = 100. French only + Spanish only + Both = French + Spanish - Both = 60 + 45 - 20 = 85. Students studying neither = 100 - 85 = 15.",
    source: "seed",
    tags: ["verified", "venn_diagram"],
    prompt: "In a class of 100 students, 60 study French, 45 study Spanish, and 20 study both languages. How many students study neither language?",
    correct: "15"
  }
];

// Helper to merge without duplicates
function mergeQuestions(filePath, newItems) {
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const ids = new Set(existing.map(q => q.id));
  const added = [];
  for (const item of newItems) {
    if (!ids.has(item.id)) {
      existing.push(item);
      added.push(item.id);
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
  console.log(`Updated ${path.basename(filePath)}: added ${added.length} questions. Total: ${existing.length}`);
}

mergeQuestions(path.join(quantDir, 'geometry.json'), newGeometry);
mergeQuestions(path.join(quantDir, 'algebra.json'), newAlgebra);
mergeQuestions(path.join(quantDir, 'arithmetic.json'), newArithmetic);
mergeQuestions(path.join(quantDir, 'data_analysis.json'), newDataAnalysis);
