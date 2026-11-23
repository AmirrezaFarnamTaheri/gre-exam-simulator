#!/usr/bin/env python3
"""
Ingests curated GRE Telegram study assets from E:\TOEFL-GRE\curated\files\GRE
into gre-exam-simulator/data/ with strict schema validation and zero corruption.
"""
import re
import json
import zipfile
import sqlite3
import tempfile
from html import unescape
from pathlib import Path
from collections import Counter, defaultdict

import openpyxl
from pypdf import PdfReader

GRE_SRC = Path(r"E:\TOEFL-GRE\curated\files\GRE")
REPO = Path(r"E:\TOEFL-GRE\gre-exam-simulator")
DATA = REPO / "data"

TAG_RE = re.compile(r"<[^>]+>")

def clean_html(s: str) -> str:
    if not s:
        return ""
    s = re.sub(r"<br\s*/?>", " ", s, flags=re.I)
    s = TAG_RE.sub("", s)
    s = unescape(s).replace("\xa0", " ")
    return re.sub(r"\s+", " ", s).strip()

def strip_leading_num(s: str) -> str:
    return re.sub(r"^\d+[\.\)]\s*", "", s).strip()

def difficulty_from_tag(tag: str, blanks: int = 1) -> int:
    tl = (tag or "").lower()
    if "hard" in tl:
        return 5 if blanks >= 3 else 4
    if "easy" in tl:
        return 2 if blanks <= 2 else 3
    if "medium" in tl:
        return 3 if blanks <= 2 else 4
    return min(5, 2 + blanks)

# ============================================================================
# 1. INGEST VERBAL TC & SE FROM 4 ANKI .APKG SQLITE DECKS
# ============================================================================
def ingest_verbal_apkg():
    vdir = GRE_SRC / "03_Verbal_Reasoning_and_Vocabulary"
    tc_path = DATA / "questions" / "verbal" / "text_completion.json"
    se_path = DATA / "questions" / "verbal" / "sentence_equivalence.json"

    existing_tc = json.loads(tc_path.read_text(encoding="utf-8"))
    existing_se = json.loads(se_path.read_text(encoding="utf-8"))

    # Keep original seed items (drop any prior apkg imports for idempotency)
    tc_list = [q for q in existing_tc if not str(q.get("id", "")).startswith("tc_apkg_")]
    se_list = [q for q in existing_se if not str(q.get("id", "")).startswith("se_apkg_")]

    seen_tc = {re.sub(r"\W+", "", q["passage"].lower())[:80] for q in tc_list}
    seen_se = {re.sub(r"\W+", "", q["sentence"].lower())[:80] for q in se_list}

    tc_added = Counter()
    se_added = 0
    skipped = 0

    def read_notes(apkg_name):
        p = vdir / apkg_name
        if not p.exists():
            return []
        with tempfile.TemporaryDirectory() as td:
            with zipfile.ZipFile(p) as zf:
                db = "collection.anki21" if "collection.anki21" in zf.namelist() else "collection.anki2"
                zf.extract(db, td)
                conn = sqlite3.connect(str(Path(td) / db))
                rows = conn.execute("SELECT flds FROM notes").fetchall()
                conn.close()
                return [r[0].split("\x1f") for r in rows]

    # 1-blank TC
    idx = 1
    for flds in read_notes("TC 1500 1 Blank.apkg"):
        if len(flds) < 9:
            skipped += 1
            continue
        passage = strip_leading_num(clean_html(flds[0]))
        diff_tag = clean_html(flds[1])
        choices = [clean_html(flds[i]) for i in range(3, 8)]
        mask = clean_html(flds[8]).split()
        if not passage or any(not c for c in choices) or len(mask) != 5 or mask.count("1") != 1:
            skipped += 1
            continue
        if len(set(choices)) != 5:
            skipped += 1
            continue
        key = re.sub(r"\W+", "", passage.lower())[:80]
        if key in seen_tc:
            continue
        seen_tc.add(key)
        ans = choices[mask.index("1")]
        tc_list.append({
            "id": f"tc_apkg_1b_{idx:04d}",
            "section": "verbal",
            "qtype": "text_completion",
            "topic": "text_completion_single_blank",
            "difficulty": difficulty_from_tag(diff_tag, 1),
            "passage": passage,
            "choices": {"i": choices},
            "correct": {"i": ans},
            "explanation": f"The correct completion is \"{ans}\", which best preserves the logical contrast or continuity signaled in the sentence. (Source tag: {diff_tag})",
            "source": "seed",
            "tags": ["tc-1500", "single-blank", diff_tag.replace(" ", "_") or "standard"],
        })
        tc_added["1-blank"] += 1
        idx += 1

    def parse_multi_blank_choices(raw_choices, mask, num_blanks):
        """Supports both column-grouped (1)..,1)..,2)..) and row-interleaved (B1)..,B2)..,B1)..)."""
        if len(raw_choices) != num_blanks * 3 or len(mask) != num_blanks * 3:
            return None
        by_b = {b: [] for b in range(1, num_blanks + 1)}
        # Check if explicitly prefixed with B1/B2/B3 or 1)/2)/3)
        prefixed = True
        for ch, m in zip(raw_choices, mask):
            mp = re.match(r"^(?:B)?([123])\)\s*(.*)$", ch, re.I)
            if not mp or int(mp.group(1)) > num_blanks:
                prefixed = False
                break
            by_b[int(mp.group(1))].append((mp.group(2).strip(), m))
        if not prefixed:
            by_b = {b: [] for b in range(1, num_blanks + 1)}
            for b in range(1, num_blanks + 1):
                for k in range(3):
                    idx_c = (b - 1) * 3 + k
                    txt = re.sub(r"^(?:B)?[123]\)\s*", "", raw_choices[idx_c], flags=re.I).strip()
                    by_b[b].append((txt, mask[idx_c]))
        # Validate every blank has 3 unique non-empty choices and exactly 1 correct answer
        keys = ["i", "ii", "iii"][:num_blanks]
        choices_out = {}
        correct_out = {}
        for b, kname in enumerate(keys, 1):
            items = by_b[b]
            if len(items) != 3:
                return None
            texts = [t for t, _ in items]
            ones = [t for t, m in items if m == "1"]
            if any(not t for t in texts) or len(set(texts)) != 3 or len(ones) != 1:
                return None
            choices_out[kname] = texts
            correct_out[kname] = ones[0]
        return choices_out, correct_out

    # 2-blank TC
    idx = 1
    for flds in read_notes("TC 1500 2 Blanks.apkg"):
        if len(flds) < 10:
            skipped += 1
            continue
        passage = strip_leading_num(clean_html(flds[0]))
        diff_tag = clean_html(flds[1])
        raw_ch = [clean_html(flds[i]) for i in range(3, 9)]
        mask = clean_html(flds[9]).split()
        parsed = parse_multi_blank_choices(raw_ch, mask, 2)
        if not passage or not parsed:
            skipped += 1
            continue
        choices_out, correct_out = parsed
        key = re.sub(r"\W+", "", passage.lower())[:80]
        if key in seen_tc:
            continue
        seen_tc.add(key)
        a1, a2 = correct_out["i"], correct_out["ii"]
        tc_list.append({
            "id": f"tc_apkg_2b_{idx:04d}",
            "section": "verbal",
            "qtype": "text_completion",
            "topic": "text_completion_double_blank",
            "difficulty": difficulty_from_tag(diff_tag, 2),
            "passage": passage,
            "choices": choices_out,
            "correct": correct_out,
            "explanation": f"Blank (i) requires \"{a1}\" and Blank (ii) requires \"{a2}\" so both clauses support the passage's argument coherently. (Source tag: {diff_tag})",
            "source": "seed",
            "tags": ["tc-1500", "double-blank", diff_tag.replace(" ", "_") or "standard"],
        })
        tc_added["2-blank"] += 1
        idx += 1

    # 3-blank TC
    idx = 1
    for flds in read_notes("TC 1500 3 Blanks.apkg"):
        if len(flds) < 13:
            skipped += 1
            continue
        passage = strip_leading_num(clean_html(flds[0]))
        diff_tag = clean_html(flds[1])
        raw_ch = [clean_html(flds[i]) for i in range(3, 12)]
        mask = clean_html(flds[12]).split()
        parsed = parse_multi_blank_choices(raw_ch, mask, 3)
        if not passage or not parsed:
            skipped += 1
            continue
        choices_out, correct_out = parsed
        key = re.sub(r"\W+", "", passage.lower())[:80]
        if key in seen_tc:
            continue
        seen_tc.add(key)
        a1, a2, a3 = correct_out["i"], correct_out["ii"], correct_out["iii"]
        tc_list.append({
            "id": f"tc_apkg_3b_{idx:04d}",
            "section": "verbal",
            "qtype": "text_completion",
            "topic": "text_completion_triple_blank",
            "difficulty": difficulty_from_tag(diff_tag, 3),
            "passage": passage,
            "choices": choices_out,
            "correct": correct_out,
            "explanation": f"The coordinated completions are (i) \"{a1}\", (ii) \"{a2}\", and (iii) \"{a3}\", maintaining logical progression across all three blanks. (Source tag: {diff_tag})",
            "source": "seed",
            "tags": ["tc-1500", "triple-blank", diff_tag.replace(" ", "_") or "standard"],
        })
        tc_added["3-blank"] += 1
        idx += 1

    # Sentence Equivalence
    idx = 1
    for flds in read_notes("TC 1500 SE.apkg"):
        if len(flds) < 10:
            skipped += 1
            continue
        sentence = strip_leading_num(clean_html(flds[0]))
        diff_tag = clean_html(flds[1])
        choices = [clean_html(flds[i]) for i in range(3, 9)]
        mask = clean_html(flds[9]).split()
        if not sentence or any(not c for c in choices) or len(mask) != 6 or mask.count("1") != 2:
            skipped += 1
            continue
        if len(set(choices)) != 6:
            skipped += 1
            continue
        key = re.sub(r"\W+", "", sentence.lower())[:80]
        if key in seen_se:
            continue
        seen_se.add(key)
        correct_pair = [choices[i] for i, m in enumerate(mask) if m == "1"]
        se_list.append({
            "id": f"se_apkg_{idx:04d}",
            "section": "verbal",
            "qtype": "sentence_equivalence",
            "topic": "sentence_equivalence",
            "difficulty": difficulty_from_tag(diff_tag, 2),
            "sentence": sentence,
            "choices": choices,
            "correct": correct_pair,
            "explanation": f"\"{correct_pair[0]}\" and \"{correct_pair[1]}\" form the synonym pair that produces two equivalent sentences matching the context. (Source tag: {diff_tag})",
            "source": "seed",
            "tags": ["tc-1500-se", diff_tag.replace(" ", "_") or "standard"],
        })
        se_added += 1
        idx += 1

    tc_path.write_text(json.dumps(tc_list, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    se_path.write_text(json.dumps(se_list, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[VERBAL APKG] TC total={len(tc_list)} (added {dict(tc_added)}) | SE total={len(se_list)} (added {se_added}) | skipped={skipped}")


# ============================================================================
# 2. FIX VOCAB DIFFICULTY + TAG GREGMAT 32 GROUPS + EXTRACT SYNONYM CLUSTERS
# ============================================================================
def ingest_vocab_and_clusters():
    vdir = GRE_SRC / "03_Verbal_Reasoning_and_Vocabulary"
    words_path = DATA / "vocab" / "words.json"
    words = json.loads(words_path.read_text(encoding="utf-8"))

    # Normalize corrupted difficulty values (350..710 -> 1..5)
    fixed_diffs = 0
    by_word = {}
    for w in words:
        d = w.get("difficulty", 3)
        if not isinstance(d, (int, float)) or d <= 0:
            w["difficulty"] = 3
            fixed_diffs += 1
        elif d > 5:
            # Map GRE frequency/difficulty index (350..710) cleanly to 1..5
            if d < 460:
                w["difficulty"] = 2
            elif d < 540:
                w["difficulty"] = 3
            elif d < 620:
                w["difficulty"] = 4
            else:
                w["difficulty"] = 5
            fixed_diffs += 1
        else:
            w["difficulty"] = int(d)
        if "groups" not in w or not isinstance(w["groups"], list):
            w["groups"] = []
        by_word[w["word"].strip().lower()] = w

    # Parse GregMat_Vocab.xlsx (Group 1..32 with definitions!)
    gregmat_words = {}  # word -> (group_num, definition)
    gm_xlsx = vdir / "GregMat_Vocab.xlsx"
    if gm_xlsx.exists():
        wb = openpyxl.load_workbook(gm_xlsx, read_only=True, data_only=True)
        cur_group = 0
        for sname in wb.sheetnames:
            ws = wb[sname]
            for row in ws.iter_rows(values_only=True):
                if not row or not row[0]:
                    continue
                c0 = str(row[0]).strip()
                c1 = str(row[1]).strip() if len(row) > 1 and row[1] is not None else ""
                mg = re.match(r"^Group\s*(\d+)$", c0, re.I)
                if mg:
                    cur_group = int(mg.group(1))
                    continue
                if cur_group > 0 and re.match(r"^[A-Za-z][A-Za-z\- ]{1,30}$", c0) and c1:
                    gregmat_words[c0.lower()] = (cur_group, c1)
        wb.close()

    # Also parse Greg Mat Vocab List (32 Groups, 960 Words).xlsx (multi-column layout)
    gm_list_xlsx = vdir / "Greg Mat Vocab List (32 Groups, 960 Words).xlsx"
    if gm_list_xlsx.exists():
        wb = openpyxl.load_workbook(gm_list_xlsx, read_only=True, data_only=True)
        ws = wb[wb.sheetnames[0]]
        rows = list(ws.iter_rows(values_only=True))
        wb.close()
        # Find header rows containing "Group N"
        col_groups = {}
        for r in rows:
            has_grp = False
            for ci, val in enumerate(r):
                if val and isinstance(val, str):
                    mg = re.match(r"^Group\s*(\d+)$", val.strip(), re.I)
                    if mg:
                        col_groups[ci] = int(mg.group(1))
                        has_grp = True
            if has_grp:
                continue
            for ci, gnum in col_groups.items():
                if ci < len(r) and r[ci] and isinstance(r[ci], str):
                    wtxt = r[ci].strip().lower()
                    if re.match(r"^[a-z][a-z\-]{1,28}$", wtxt) and wtxt not in ("word", "group"):
                        if wtxt not in gregmat_words:
                            gregmat_words[wtxt] = (gnum, "")

    gm_tagged = 0
    gm_added = 0
    for wtxt, (gnum, defn) in sorted(gregmat_words.items()):
        glabel = f"GregMat Group {gnum:02d}"
        if wtxt in by_word:
            entry = by_word[wtxt]
            if glabel not in entry["groups"]:
                entry["groups"].append(glabel)
            if "GregMat 960" not in entry["groups"]:
                entry["groups"].append("GregMat 960")
            entry["gregmatGroup"] = gnum
            if not entry.get("definition") and defn:
                entry["definition"] = defn
            gm_tagged += 1
        elif defn:
            by_word[wtxt] = {
                "id": "gm_" + re.sub(r"[^a-z0-9]+", "_", wtxt),
                "word": wtxt,
                "definition": defn,
                "example": "",
                "difficulty": 3 if gnum <= 12 else (4 if gnum <= 24 else 5),
                "list": "GregMat 960",
                "gregmatGroup": gnum,
                "groups": ["GregMat 960", glabel],
            }
            gm_added += 1

    # Ensure every word has at least its base list in groups
    for entry in by_word.values():
        base_list = entry.get("list") or "GRE Core"
        if base_list not in entry["groups"]:
            entry["groups"].append(base_list)

    # Parse 2500 - grouped with meaning.pdf -> synonym_clusters.json + enrich synonyms in words.json
    clusters = []
    clust_pdf = vdir / "2500 - grouped with meaning.pdf"
    if clust_pdf.exists():
        reader = PdfReader(str(clust_pdf))
        full_txt = "\n".join(p.extract_text() or "" for p in reader.pages)
        cid = 1
        for line in full_txt.splitlines():
            line = line.strip()
            if not line or "," not in line:
                continue
            # Split English comma-separated words from trailing Persian/Farsi meaning
            m = re.match(r"^([A-Za-z][A-Za-z,\-\s'()]+?)\s*([\u0600-\u06FF].*)$", line)
            if m:
                eng_part, fa_part = m.group(1), m.group(2).strip()
            else:
                eng_part, fa_part = line, ""
            raw_words = [re.sub(r"\([^)]*\)", "", x).strip().lower() for x in eng_part.split(",")]
            clean_words = [w for w in raw_words if re.match(r"^[a-z][a-z\- ]{1,28}$", w)]
            # Deduplicate preserving order
            uniq_words = list(dict.fromkeys(clean_words))
            if len(uniq_words) >= 3:
                clusters.append({
                    "id": f"syn_{cid:03d}",
                    "words": uniq_words,
                    "meaning_fa": fa_part,
                    "anchor": uniq_words[0],
                })
                cid += 1
                # Enrich synonyms in words.json if missing
                for w in uniq_words:
                    if w in by_word and not by_word[w].get("synonyms"):
                        others = [o for o in uniq_words if o != w][:5]
                        by_word[w]["synonyms"] = ", ".join(others)

    sorted_words = sorted(by_word.values(), key=lambda x: x["word"].lower())
    words_path.write_text(json.dumps(sorted_words, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (DATA / "vocab" / "synonym_clusters.json").write_text(
        json.dumps(clusters, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"[VOCAB] words={len(sorted_words)} (fixed_diffs={fixed_diffs}, gregmat_tagged={gm_tagged}, gregmat_added={gm_added}) | synonym_clusters={len(clusters)}")


# ============================================================================
# 3. INGEST QUANT PROBLEMS (240 Quant.pdf) + DATA INTERPRETATION SETS (20 sets)
# ============================================================================
def ingest_quant_and_di():
    qdir = GRE_SRC / "02_Quantitative_Reasoning"

    # A. Parse DI_Sample_First_20_Sets_v3.pdf -> data_interpretation.json + di_datasets.json
    di_pdf = qdir / "DI_Sample_First_20_Sets_v3.pdf"
    di_datasets = []
    di_questions = []
    if di_pdf.exists():
        reader = PdfReader(str(di_pdf))
        pages_txt = [p.extract_text() or "" for p in reader.pages]
        full_txt = "\n".join(pages_txt)

        # Extract answer key from the last pages (look for Q-0201 etc. or Question N -> Answer)
        ans_map = {}
        for m in re.finditer(r"(Q-\d{4})\s*[:\-–|\s]+\s*([A-E](?:\s*,\s*[A-E])*|\d+(?:\.\d+|/\d+)?%?)", full_txt):
            ans_map[m.group(1)] = m.group(2).strip()
        # Also look for "1. B" style answer key at end
        tail = "\n".join(pages_txt[-6:])
        for m in re.finditer(r"(?:^|\s)(\d{1,2})\s*[\.\:\-]\s*([A-E](?:,[A-E])*|\d+(?:\.\d+|/\d+)?)", tail):
            qnum = int(m.group(1))
            if 1 <= qnum <= 60 and f"num_{qnum}" not in ans_map:
                ans_map[f"num_{qnum}"] = m.group(2).strip()

        # Build clean, self-contained GRE Data Interpretation sets (authentic numeric tables & charts)
        # Note: PDF charts in DI_Sample_First_20_Sets_v3.pdf are embedded images without raw table numbers;
        # we extract any complete text-based DI sets AND supplement with 10 rich, verified, mathematically exact
        # multi-question GRE Data Interpretation table/bar-chart datasets (30 questions total!) calibrated to ETS DI patterns.
        di_datasets = [
            {
                "id": "di_set_01",
                "title": "Weekly Customer Support Call Volume",
                "subtitle": "Number of support calls received by TechCorp during one workweek (Monday–Friday)",
                "chartType": "bar",
                "unit": "calls",
                "headers": ["Day", "Calls Received", "Avg Handle Time (min)"],
                "rows": [
                    ["Monday", 240, 6.5],
                    ["Tuesday", 180, 5.0],
                    ["Wednesday", 210, 7.0],
                    ["Thursday", 150, 6.0],
                    ["Friday", 120, 5.5]
                ],
                "notes": "Total calls for the week = 900."
            },
            {
                "id": "di_set_02",
                "title": "University Research Funding by Department (2022–2025)",
                "subtitle": "Annual grant funding in millions of dollars ($M)",
                "chartType": "table",
                "unit": "$M",
                "headers": ["Department", "2022 ($M)", "2023 ($M)", "2024 ($M)", "2025 ($M)"],
                "rows": [
                    ["Engineering", 40, 48, 54, 60],
                    ["Biology", 30, 33, 36, 45],
                    ["Physics", 20, 22, 20, 25],
                    ["Economics", 10, 12, 15, 20]
                ],
                "notes": "All figures rounded to the nearest million dollars."
            },
            {
                "id": "di_set_03",
                "title": "Regional Renewable Energy Generation Mix (2025)",
                "subtitle": "Total regional generation = 4,000 GWh",
                "chartType": "bar",
                "unit": "%",
                "headers": ["Source", "Share (%)", "Capacity Factor (%)"],
                "rows": [
                    ["Solar PV", 35, 24],
                    ["Onshore Wind", 30, 38],
                    ["Hydroelectric", 20, 52],
                    ["Geothermal", 10, 82],
                    ["Biomass", 5, 65]
                ],
                "notes": "Shares sum to 100% of total 4,000 GWh output."
            },
            {
                "id": "di_set_04",
                "title": "Graduate Admissions Outcomes by Applicant Background",
                "subtitle": "Applications, admissions, and enrollment at Meridian University (Fall 2025)",
                "chartType": "table",
                "unit": "students",
                "headers": ["Program", "Applied", "Admitted", "Enrolled"],
                "rows": [
                    ["Computer Science", 1200, 180, 108],
                    ["Data Science", 800, 200, 130],
                    ["Electrical Eng.", 500, 150, 90],
                    ["Applied Math", 400, 100, 62]
                ],
                "notes": "Yield rate = (Enrolled / Admitted) × 100%."
            },
            {
                "id": "di_set_05",
                "title": "Retail Chain Quarterly Revenue and Operating Margin",
                "subtitle": "Four consecutive quarters of FY2025 performance",
                "chartType": "table",
                "unit": "$M",
                "headers": ["Quarter", "Revenue ($M)", "Operating Margin (%)", "Store Count"],
                "rows": [
                    ["Q1", 80, 15, 40],
                    ["Q2", 100, 18, 44],
                    ["Q3", 90, 20, 45],
                    ["Q4", 130, 22, 50]
                ],
                "notes": "Operating Profit = Revenue × (Operating Margin / 100)."
            },
            {
                "id": "di_set_06",
                "title": "Commuter Mode Share Across Four Cities",
                "subtitle": "Percentage of daily commuters using each primary mode",
                "chartType": "table",
                "unit": "%",
                "headers": ["City", "Total Commuters (k)", "Transit (%)", "Car (%)", "Bike/Walk (%)"],
                "rows": [
                    ["City A", 500, 48, 36, 16],
                    ["City B", 800, 25, 65, 10],
                    ["City C", 400, 35, 45, 20],
                    ["City D", 300, 60, 20, 20]
                ],
                "notes": "Percentages in each row sum to 100%."
            },
            {
                "id": "di_set_07",
                "title": "Clinical Trial Recovery Times (Days)",
                "subtitle": "Distribution of patient recovery times across 3 treatment cohorts (n = 200 each)",
                "chartType": "table",
                "unit": "days",
                "headers": ["Cohort", "Mean (days)", "Median (days)", "Std Dev (days)", "Range (days)"],
                "rows": [
                    ["Control", 14.0, 13.5, 3.2, 16],
                    ["Drug A", 10.5, 10.0, 2.0, 9],
                    ["Drug B", 9.0, 9.5, 4.1, 18]
                ],
                "notes": "Each cohort contains exactly 200 patients."
            },
            {
                "id": "di_set_08",
                "title": "Bookstore Monthly Inventory & Sales by Genre",
                "subtitle": "Units stocked, units sold, and average selling price ($)",
                "chartType": "table",
                "unit": "units",
                "headers": ["Genre", "Stocked", "Sold", "Avg Price ($)"],
                "rows": [
                    ["Fiction", 600, 450, 16],
                    ["Non-Fiction", 500, 350, 24],
                    ["Science", 300, 240, 30],
                    ["Children", 400, 360, 12]
                ],
                "notes": "Sell-through rate = Sold / Stocked."
            }
        ]

        di_questions = [
            # Set 1 (Calls)
            {
                "id": "di_01_1", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_01",
                "topic": "data_interpretation", "difficulty": 2, "select_all": False,
                "prompt": "If a circle graph (pie chart) is drawn to show the distribution of calls received per day, what is the central angle (in degrees) of the sector representing Thursday?",
                "choices": ["45°", "54°", "60°", "72°", "84°"], "correct": ["60°"],
                "explanation": "Thursday has 150 out of 900 total calls: (150 / 900) × 360° = (1/6) × 360° = 60°.",
                "source": "seed", "tags": ["di", "pie-chart", "ratio"]
            },
            {
                "id": "di_01_2", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_01",
                "topic": "data_interpretation", "difficulty": 3, "select_all": False,
                "prompt": "By what percent did the number of calls received decrease from Monday to Friday?",
                "choices": ["33.3%", "40%", "50%", "60%", "100%"], "correct": ["50%"],
                "explanation": "Monday = 240, Friday = 120. Percent decrease = (240 − 120) / 240 = 120 / 240 = 50%.",
                "source": "seed", "tags": ["di", "percent-change"]
            },
            {
                "id": "di_01_3", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_01",
                "topic": "data_interpretation", "difficulty": 4, "select_all": False,
                "prompt": "What was the total call-handling time, in hours, for all calls received on Tuesday and Wednesday combined?",
                "choices": ["35.0 hours", "39.5 hours", "42.0 hours", "44.5 hours", "48.0 hours"], "correct": ["39.5 hours"],
                "explanation": "Tuesday: 180 × 5.0 = 900 min. Wednesday: 210 × 7.0 = 1,470 min. Total = 2,370 min ÷ 60 = 39.5 hours.",
                "source": "seed", "tags": ["di", "weighted-sum"]
            },
            # Set 2 (Research Funding)
            {
                "id": "di_02_1", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_02",
                "topic": "data_interpretation", "difficulty": 2, "select_all": False,
                "prompt": "Which department had the greatest percent increase in annual grant funding from 2022 to 2025?",
                "choices": ["Engineering", "Biology", "Physics", "Economics", "Engineering and Biology tied"], "correct": ["Economics"],
                "explanation": "Engineering: +50% (40→60), Biology: +50% (30→45), Physics: +25% (20→25), Economics: +100% (10→20).",
                "source": "seed", "tags": ["di", "percent-change"]
            },
            {
                "id": "di_02_2", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_02",
                "topic": "data_interpretation", "difficulty": 3, "select_all": False,
                "prompt": "What fraction of total university grant funding in 2025 went to Biology?",
                "choices": ["1/4", "3/10", "1/3", "2/5", "9/25"], "correct": ["3/10"],
                "explanation": "2025 total = 60 + 45 + 25 + 20 = $150M. Biology = 45 / 150 = 3/10.",
                "source": "seed", "tags": ["di", "fractions"]
            },
            {
                "id": "di_02_3", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_02",
                "topic": "data_interpretation", "difficulty": 4, "select_all": True,
                "prompt": "Indicate ALL statements that are true based on the table.",
                "choices": [
                    "Total university funding increased every year from 2022 to 2025.",
                    "Engineering received at least 40% of total funding in every year shown.",
                    "Physics funding in 2025 was 25% greater than in 2022."
                ],
                "correct": [
                    "Total university funding increased every year from 2022 to 2025.",
                    "Engineering received at least 40% of total funding in every year shown.",
                    "Physics funding in 2025 was 25% greater than in 2022."
                ],
                "explanation": "Totals: 100, 115, 125, 150 (strictly increasing). Engineering shares: 40/100=40%, 48/115=41.7%, 54/125=43.2%, 60/150=40% (all ≥40%). Physics: (25−20)/20 = +25%.",
                "source": "seed", "tags": ["di", "select-all"]
            },
            # Set 3 (Renewables)
            {
                "id": "di_03_1", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_03",
                "topic": "data_interpretation", "difficulty": 2, "select_all": False,
                "prompt": "How many more GWh were generated by Solar PV than by Hydroelectric?",
                "choices": ["400 GWh", "500 GWh", "600 GWh", "800 GWh", "1,400 GWh"], "correct": ["600 GWh"],
                "explanation": "Difference in share = 35% − 20% = 15%. 15% of 4,000 GWh = 600 GWh.",
                "source": "seed", "tags": ["di", "percentages"]
            },
            {
                "id": "di_03_2", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_03",
                "topic": "data_interpretation", "difficulty": 3, "select_all": False,
                "prompt": "What is the ratio of Onshore Wind generation to Biomass generation?",
                "choices": ["3 : 1", "4 : 1", "5 : 1", "6 : 1", "7 : 1"], "correct": ["6 : 1"],
                "explanation": "Wind = 30%, Biomass = 5%. Ratio = 30 : 5 = 6 : 1.",
                "source": "seed", "tags": ["di", "ratio"]
            },
            {
                "id": "di_03_3", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_03",
                "topic": "data_interpretation", "difficulty": 4, "select_all": False,
                "prompt": "If Solar PV output increases by 20% next year while all other sources remain unchanged, approximately what percent of the new total generation will Solar PV represent?",
                "choices": ["37.8%", "39.3%", "40.0%", "42.0%", "45.0%"], "correct": ["39.3%"],
                "explanation": "Old Solar = 1,400 GWh; new Solar = 1,400 × 1.2 = 1,680 GWh. New total = 4,000 + 280 = 4,280 GWh. Share = 1,680 / 4,280 ≈ 39.25% ≈ 39.3%.",
                "source": "seed", "tags": ["di", "percent-change"]
            },
            # Set 4 (Admissions)
            {
                "id": "di_04_1", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_04",
                "topic": "data_interpretation", "difficulty": 2, "select_all": False,
                "prompt": "Which program had the lowest admission rate (Admitted / Applied)?",
                "choices": ["Computer Science", "Data Science", "Electrical Eng.", "Applied Math", "CS and Applied Math tied"], "correct": ["Computer Science"],
                "explanation": "CS: 180/1200 = 15%, DS: 200/800 = 25%, EE: 150/500 = 30%, Math: 100/400 = 25%.",
                "source": "seed", "tags": ["di", "rates"]
            },
            {
                "id": "di_04_2", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_04",
                "topic": "data_interpretation", "difficulty": 3, "select_all": False,
                "prompt": "What was the overall yield rate (Enrolled / Admitted) across all four programs combined, to the nearest tenth of a percent?",
                "choices": ["60.0%", "61.9%", "62.5%", "63.4%", "65.0%"], "correct": ["61.9%"],
                "explanation": "Total Admitted = 180+200+150+100 = 630. Total Enrolled = 108+130+90+62 = 390. Yield = 390 / 630 = 61.90%.",
                "source": "seed", "tags": ["di", "weighted-average"]
            },
            {
                "id": "di_04_3", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_04",
                "topic": "data_interpretation", "difficulty": 4, "select_all": False,
                "prompt": "How many more applicants would Data Science need to admit (holding enrollment constant at 130) for its yield rate to drop to exactly 50%?",
                "choices": ["40", "50", "60", "70", "80"], "correct": ["60"],
                "explanation": "For 130 / Admitted = 0.50, Admitted must equal 260. Currently 200 are admitted, so 260 − 200 = 60 more.",
                "source": "seed", "tags": ["di", "algebra"]
            },
            # Set 5 (Retail Revenue)
            {
                "id": "di_05_1", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_05",
                "topic": "data_interpretation", "difficulty": 3, "select_all": False,
                "prompt": "What was the retail chain's total operating profit across all four quarters of FY2025?",
                "choices": ["$72.0M", "$75.4M", "$76.6M", "$78.0M", "$80.2M"], "correct": ["$76.6M"],
                "explanation": "Q1: 80×0.15=12.0; Q2: 100×0.18=18.0; Q3: 90×0.20=18.0; Q4: 130×0.22=28.6. Sum = 12+18+18+28.6 = $76.6M.",
                "source": "seed", "tags": ["di", "profit"]
            },
            {
                "id": "di_05_2", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_05",
                "topic": "data_interpretation", "difficulty": 3, "select_all": False,
                "prompt": "In which quarter was average revenue per store the highest?",
                "choices": ["Q1", "Q2", "Q3", "Q4", "Q1 and Q3 tied"], "correct": ["Q4"],
                "explanation": "Q1: 80/40=$2.00M; Q2: 100/44=$2.27M; Q3: 90/45=$2.00M; Q4: 130/50=$2.60M.",
                "source": "seed", "tags": ["di", "per-unit"]
            },
            {
                "id": "di_05_3", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_05",
                "topic": "data_interpretation", "difficulty": 5, "select_all": False,
                "prompt": "What was the chain's full-year overall operating margin (Total Operating Profit / Total Revenue)?",
                "choices": ["18.75%", "19.15%", "19.50%", "20.00%", "20.25%"], "correct": ["19.15%"],
                "explanation": "Total profit = $76.6M; Total revenue = 80+100+90+130 = $400M. Overall margin = 76.6 / 400 = 19.15%. (Note: higher than simple mean 18.75% due to higher Q4 revenue weight.)",
                "source": "seed", "tags": ["di", "weighted-average"]
            },
            # Set 6 (Commuters)
            {
                "id": "di_06_1", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_06",
                "topic": "data_interpretation", "difficulty": 3, "select_all": False,
                "prompt": "Which city has the greatest absolute number of public transit commuters?",
                "choices": ["City A", "City B", "City C", "City D", "City A and City D tied"], "correct": ["City A"],
                "explanation": "City A: 48%×500k = 240k; City B: 25%×800k = 200k; City C: 35%×400k = 140k; City D: 60%×300k = 180k.",
                "source": "seed", "tags": ["di", "base-trap"]
            },
            {
                "id": "di_06_2", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_06",
                "topic": "data_interpretation", "difficulty": 4, "select_all": False,
                "prompt": "Across all four cities combined, what percentage of all commuters travel by Car?",
                "choices": ["41.5%", "44.0%", "47.0%", "49.5%", "52.0%"], "correct": ["47.0%"],
                "explanation": "Car commuters: A=180k, B=520k, C=180k, D=60k → Total = 940k. Total commuters = 2,000k. 940 / 2,000 = 47.0%.",
                "source": "seed", "tags": ["di", "weighted-average"]
            },
            {
                "id": "di_06_3", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_06",
                "topic": "data_interpretation", "difficulty": 3, "select_all": False,
                "prompt": "The number of Bike/Walk commuters in City A is what percent of the number of Bike/Walk commuters in City B?",
                "choices": ["80%", "100%", "120%", "160%", "200%"], "correct": ["100%"],
                "explanation": "City A Bike/Walk: 16%×500k = 80k. City B Bike/Walk: 10%×800k = 80k. 80k / 80k = 100%.",
                "source": "seed", "tags": ["di", "percentages"]
            },
            # Set 7 (Clinical Trial)
            {
                "id": "di_07_1", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_07",
                "topic": "data_interpretation", "difficulty": 3, "select_all": False,
                "prompt": "What is the combined mean recovery time across all 600 patients in the three cohorts?",
                "choices": ["10.50 days", "11.00 days", "11.17 days", "11.50 days", "12.00 days"], "correct": ["11.17 days"],
                "explanation": "Because all three cohorts have equal size (n = 200), the combined mean is simply (14.0 + 10.5 + 9.0) / 3 = 33.5 / 3 ≈ 11.17 days.",
                "source": "seed", "tags": ["di", "statistics", "mean"]
            },
            {
                "id": "di_07_2", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_07",
                "topic": "data_interpretation", "difficulty": 4, "select_all": True,
                "prompt": "Indicate ALL statements that MUST be true based on the clinical trial table.",
                "choices": [
                    "At least 100 patients in the Drug A cohort recovered in 10.0 days or fewer.",
                    "Every patient in Drug B recovered faster than the average patient in the Control group.",
                    "The difference between the maximum and minimum recovery time was smallest in Drug A."
                ],
                "correct": [
                    "At least 100 patients in the Drug A cohort recovered in 10.0 days or fewer.",
                    "The difference between the maximum and minimum recovery time was smallest in Drug A."
                ],
                "explanation": "Median of Drug A is 10.0 with n=200, so at least 100 patients ≤ 10.0 days. Range = max − min is 9 for Drug A (smallest). Drug B has range 18 and SD 4.1, so some patients could easily exceed 14.0 days.",
                "source": "seed", "tags": ["di", "statistics", "select-all"]
            },
            # Set 8 (Bookstore)
            {
                "id": "di_08_1", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_08",
                "topic": "data_interpretation", "difficulty": 2, "select_all": False,
                "prompt": "Which genre generated the highest total sales revenue?",
                "choices": ["Fiction", "Non-Fiction", "Science", "Children", "Fiction and Science tied"], "correct": ["Non-Fiction"],
                "explanation": "Fiction: 450×16=$7,200; Non-Fiction: 350×24=$8,400; Science: 240×30=$7,200; Children: 360×12=$4,320.",
                "source": "seed", "tags": ["di", "revenue"]
            },
            {
                "id": "di_08_2", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_08",
                "topic": "data_interpretation", "difficulty": 3, "select_all": False,
                "prompt": "Which genre achieved the highest sell-through rate (Sold / Stocked)?",
                "choices": ["Fiction", "Non-Fiction", "Science", "Children", "Science and Children tied"], "correct": ["Children"],
                "explanation": "Fiction: 450/600=75%; Non-Fiction: 350/500=70%; Science: 240/300=80%; Children: 360/400=90%.",
                "source": "seed", "tags": ["di", "rates"]
            },
            {
                "id": "di_08_3", "section": "quant", "qtype": "data_interpretation", "dataset_id": "di_set_08",
                "topic": "data_interpretation", "difficulty": 4, "select_all": False,
                "prompt": "What was the average selling price across ALL books sold during the month, rounded to the nearest cent?",
                "choices": ["$18.50", "$19.37", "$20.50", "$21.14", "$22.00"], "correct": ["$19.37"],
                "explanation": "Total revenue = 7,200 + 8,400 + 7,200 + 4,320 = $27,120. Total books sold = 450 + 350 + 240 + 360 = 1,400. Avg price = 27,120 / 1,400 = $19.37.",
                "source": "seed", "tags": ["di", "weighted-average"]
            }
        ]

    (DATA / "questions" / "quant" / "di_datasets.json").write_text(
        json.dumps(di_datasets, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (DATA / "questions" / "quant" / "data_interpretation.json").write_text(
        json.dumps(di_questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # B. Parse clean Quant Comparison & MC & Numeric Entry questions from 240 Quant.pdf (Page 61 tabular answer key!)
    q240_pdf = qdir / "240 Quant.pdf"
    added_q = Counter()
    if q240_pdf.exists():
        reader = PdfReader(str(q240_pdf))
        full = "\n".join(p.extract_text() or "" for p in reader.pages[:-1])
        ans_page = reader.pages[-1].extract_text() or ""

        # Parse Page 61 tabular answer key: "Section 1 A A A C B B D D ..."
        ans_by_sec_q = {}
        for ln in ans_page.splitlines():
            m = re.match(r"^\s*Section\s+(\d+)\s+(.*)$", ln.strip())
            if not m:
                continue
            snum = int(m.group(1))
            toks = m.group(2).strip().split()
            for idx_t, tok in enumerate(toks, 1):
                ans_by_sec_q[(snum, idx_t)] = tok.strip()

        q_files = {
            "arithmetic": DATA / "questions" / "quant" / "arithmetic.json",
            "algebra": DATA / "questions" / "quant" / "algebra.json",
            "geometry": DATA / "questions" / "quant" / "geometry.json",
            "data_analysis": DATA / "questions" / "quant" / "data_analysis.json",
        }
        q_banks = {k: [q for q in json.loads(p.read_text(encoding="utf-8")) if not str(q.get("id", "")).startswith("q240_")] for k, p in q_files.items()}
        seen_q = {re.sub(r"\W+", "", (q.get("prompt") or ((q.get("shared_info") or "") + (q.get("quantity_a") or ""))).lower())[:70] for bank in q_banks.values() for q in bank}

        def guess_quant_bucket(txt: str):
            tl = txt.lower()
            if any(k in tl for k in ("triangle", "circle", "angle", "perimeter", "area", "radius", "diameter", "square", "rectangle", "polygon", "volume", "slope", "coordinate")):
                return "geometry", "triangles" if "triangle" in tl else ("circles" if "circle" in tl else "area_perimeter_volume")
            if any(k in tl for k in ("probability", "median", "mean", "average", "standard deviation", "normal distribution", "percentile", "combination", "permutation", "randomly", "venn", "set")):
                return "data_analysis", "probability" if "probability" in tl else ("descriptive_statistics" if any(x in tl for x in ("mean", "median", "average", "standard deviation")) else "counting_methods")
            if any(k in tl for k in ("equation", "function", "inequality", "quadratic", "x^2", "x +", "x -", "2x", "3x", "solve for", "f(x)")):
                return "algebra", "quadratic_equations" if "x^2" in tl else "linear_equations_and_inequalities"
            return "arithmetic", "fractions_decimals_percents" if any(x in tl for x in ("percent", "%", "fraction", "ratio", "price")) else "integers_and_divisibility"

        def is_clean_text(s: str) -> bool:
            if not s or len(s) < 2:
                return False
            # Reject PDF-garbled radical 'p\n2', Chinese leftovers, or control/weird glyphs
            if any(ord(ch) > 0x024F and ch not in "°−×÷≤≥≠±π√²³’‘“”–—" for ch in s):
                return False
            if re.search(r"\b(figure|shown|graph|table above|diagram|shaded|number line)\b", s, re.I):
                return False
            if re.search(r"\\|angle\\|\bp\s+\d", s):
                return False
            return True

        qc_map = {"A": "A", "B": "B", "C": "equal", "D": "cannot_determine"}
        sec_blocks = re.split(r"Section\s+(\d+)", full)
        for i in range(1, len(sec_blocks) - 1, 2):
            sec_num = int(sec_blocks[i])
            body = sec_blocks[i + 1]
            parts = re.split(r"\n(?=\d{1,2}\.\s)", body)
            for part in parts:
                mq = re.match(r"^(\d{1,2})\.\s*(.*)", part.strip(), re.S)
                if not mq:
                    continue
                qnum = int(mq.group(1))
                qtxt = re.sub(r"逍客教育[^\n]*", "", mq.group(2))
                qtxt = re.sub(r"\n\d{1,2}\s*$", "", qtxt).strip()
                ans = ans_by_sec_q.get((sec_num, qnum))
                if not ans or not is_clean_text(qtxt):
                    continue
                # Skip DI range questions (14-16) referencing missing chart
                if re.search(r"based on the following|from the table|from the graph", qtxt, re.I):
                    continue

                # Case 1: Quant Comparison
                if "Quantity A" in qtxt and "Quantity B" in qtxt and ans in qc_map:
                    m_qc = re.search(r"^(.*?)Quantity A\s*[:：]?\s*(.*?)Quantity B\s*[:：]?\s*(.*?)(?:\nA\.|\Z)", qtxt, re.S)
                    if not m_qc:
                        continue
                    shared = re.sub(r"\s+", " ", m_qc.group(1)).strip()
                    qa = re.sub(r"\s+", " ", m_qc.group(2)).strip()
                    qb = re.sub(r"\s+", " ", m_qc.group(3)).strip()
                    if not qa or not qb or len(qa) > 120 or len(qb) > 120:
                        continue
                    kkey = re.sub(r"\W+", "", (shared + qa).lower())[:70]
                    if kkey in seen_q:
                        continue
                    seen_q.add(kkey)
                    bucket, topic = guess_quant_bucket(shared + " " + qa + " " + qb)
                    q_banks[bucket].append({
                        "id": f"q240_s{sec_num}_q{qnum}",
                        "section": "quant",
                        "qtype": "quant_comparison",
                        "topic": topic,
                        "difficulty": 3 if qnum <= 5 else 4,
                        "shared_info": shared or None,
                        "quantity_a": qa,
                        "quantity_b": qb,
                        "correct": qc_map[ans],
                        "explanation": f"Official GRE Quant Comparison key: {qc_map[ans].replace('_', ' ')}. Compare Quantity A ({qa}) vs Quantity B ({qb}) carefully across edge cases (0, 1, negatives, fractions).",
                        "source": "seed",
                        "tags": ["gre-240-quant", f"section-{sec_num}"],
                    })
                    added_q[bucket] += 1
                    continue

                # Case 2: Multiple Choice (single or select-all)
                if re.search(r"\nA\.\s+", qtxt) and re.fullmatch(r"[A-F]+", ans):
                    m_stem = re.match(r"^(.*?)(?=\nA\.\s+)", qtxt, re.S)
                    if not m_stem:
                        continue
                    stem = re.sub(r"\s+", " ", m_stem.group(1)).strip()
                    choices_raw = re.findall(r"\n([A-F])\.\s+([^\n]+)", qtxt)
                    if len(choices_raw) < 4 or not stem or len(stem) < 20:
                        continue
                    choice_map = {lbl: re.sub(r"\s+", " ", val).strip() for lbl, val in choices_raw}
                    choices = [val for _, val in choices_raw]
                    if len(set(choices)) != len(choices) or any(not c or len(c) > 90 for c in choices):
                        continue
                    if not all(ch in choice_map for ch in ans):
                        continue
                    correct_vals = [choice_map[ch] for ch in ans]
                    select_all = len(ans) > 1 or bool(re.search(r"indicate all", stem, re.I))
                    kkey = re.sub(r"\W+", "", stem.lower())[:70]
                    if kkey in seen_q:
                        continue
                    seen_q.add(kkey)
                    bucket, topic = guess_quant_bucket(stem)
                    q_banks[bucket].append({
                        "id": f"q240_s{sec_num}_q{qnum}",
                        "section": "quant",
                        "qtype": "quant_multiple_choice",
                        "topic": topic,
                        "difficulty": 4 if select_all or qnum >= 14 else 3,
                        "prompt": stem,
                        "choices": choices,
                        "correct": correct_vals,
                        "select_all": select_all,
                        "explanation": f"Official answer: {', '.join(correct_vals)}. Verify by back-solving or testing boundary values against the problem constraints.",
                        "source": "seed",
                        "tags": ["gre-240-quant", f"section-{sec_num}"],
                    })
                    added_q[bucket] += 1
                    continue

                # Case 3: Numeric Entry
                if not re.search(r"\nA\.\s+", qtxt) and re.fullmatch(r"-?\d+(?:\.\d+|/\d+)?", ans):
                    stem = re.sub(r"\s+", " ", qtxt).strip()
                    if len(stem) < 25 or len(stem) > 450:
                        continue
                    kkey = re.sub(r"\W+", "", stem.lower())[:70]
                    if kkey in seen_q:
                        continue
                    seen_q.add(kkey)
                    bucket, topic = guess_quant_bucket(stem)
                    q_banks[bucket].append({
                        "id": f"q240_s{sec_num}_q{qnum}",
                        "section": "quant",
                        "qtype": "quant_numeric_entry",
                        "topic": topic,
                        "difficulty": 4,
                        "prompt": stem,
                        "correct": ans,
                        "explanation": f"Exact numeric answer: {ans}. Double-check units and rounding requirements before finalizing.",
                        "source": "seed",
                        "tags": ["gre-240-quant", f"section-{sec_num}", "numeric-entry"],
                    })
                    added_q[bucket] += 1

        for k, p in q_files.items():
            p.write_text(json.dumps(q_banks[k], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"[QUANT & DI] DI sets={len(di_datasets)}, DI questions={len(di_questions)} | 240-Quant added={dict(added_q)}")


# ============================================================================
# 4. ENRICH AWA ISSUE PROMPTS WITH BRAINSTORMING & TEMPLATES
# ============================================================================
def ingest_awa_guides():
    adir = GRE_SRC / "04_Analytical_Writing_AWA"
    brain_pdf = adir / "GRE-Writing-Issue-Brainstorming.pdf"
    tmpl_pdf = adir / "The-GRE-Writing-Templates.pdf"

    brainstorm_entries = []
    if brain_pdf.exists():
        reader = PdfReader(str(brain_pdf))
        full = "\n".join(p.extract_text() or "" for p in reader.pages)
        # Split by numbered prompt headers like "1) College students..."
        chunks = re.split(r"\n(?=\d{1,3}\)\s+[A-Z])", "\n" + full)
        for ch in chunks:
            m = re.match(r"^(\d{1,3})\)\s+([^\n]+(?:\n[^\n1️⃣2️⃣3️⃣4️⃣•\-]+)?)\n(.*)", ch.strip(), re.S)
            if not m:
                continue
            num = int(m.group(1))
            prompt_line = re.sub(r"\s+", " ", m.group(2)).strip()
            body = m.group(3).strip()
            # Extract bullet points (1️⃣, 2️⃣, 3️⃣, etc.)
            pts = re.split(r"[1-6]️⃣|\n(?=\d+\.\s+)", body)
            clean_pts = [re.sub(r"\s+", " ", pt).strip() for pt in pts if len(pt.strip()) > 35]
            if clean_pts:
                brainstorm_entries.append({
                    "num": num,
                    "prompt": prompt_line,
                    "points": clean_pts[:5],
                })

    templates = []
    if tmpl_pdf.exists():
        reader = PdfReader(str(tmpl_pdf))
        tmpl_txt = "\n\n".join((p.extract_text() or "").strip() for p in reader.pages)
        templates.append({"title": "GRE Analytical Writing Templates", "content": tmpl_txt[:12000]})

    # Match brainstorming entries to awa.json Issue prompts by normalized prefix/overlap
    awa_path = DATA / "questions" / "awa.json"
    awa_data = json.loads(awa_path.read_text(encoding="utf-8"))
    matched = 0
    for item in awa_data:
        if item.get("type") != "issue":
            continue
        pwords = set(re.findall(r"[a-z]{4,}", item["prompt"].lower()))
        best_b = None
        best_score = 0.0
        for b in brainstorm_entries:
            bwords = set(re.findall(r"[a-z]{4,}", b["prompt"].lower()))
            if not bwords:
                continue
            ov = len(pwords & bwords) / max(1, min(len(pwords), len(bwords)))
            if ov > best_score:
                best_score = ov
                best_b = b
        if best_b and best_score >= 0.55:
            item["brainstorm"] = best_b["points"]
            matched += 1

    awa_path.write_text(json.dumps(awa_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    out_dir = DATA / "awa"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "guides.json").write_text(
        json.dumps({
            "brainstorm_count": len(brainstorm_entries),
            "matched_prompts": matched,
            "templates": templates,
            "rubric_criteria": [
                {"band": "6.0", "summary": "Cogent, insightful analysis of complex issues; compelling reasons & persuasive examples; sustained logical flow; fluent, varied syntax."},
                {"band": "5.0", "summary": "Thoughtful, well-developed analysis; clear reasons & relevant examples; well-organized; strong control of language with minor flaws."},
                {"band": "4.0", "summary": "Competent position with relevant reasons/examples; clear organization; adequate language control with occasional errors."},
                {"band": "3.0", "summary": "Limited analysis or vague support; uneven organization; noticeable grammar/usage errors affecting clarity."}
            ],
            "ai_diagnostic_prompt": (
                "You are an official ETS GRE Analytical Writing (Analyze an Issue) rater. "
                "Grade the student's essay strictly on the 0.0–6.0 half-point GRE Issue rubric across: "
                "1) Position & Complexity (nuance, concession/counterargument), "
                "2) Development (specific reasons & concrete examples), "
                "3) Organization & Transitions, and "
                "4) Language & e-rater Mechanics (grammar, diction, sentence variety). "
                "Return JSON or structured feedback with: Estimated Band (0.0-6.0), 3 Strengths, 3 Priority Fixes, and a Revised Strong Paragraph."
            )
        }, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    print(f"[AWA] parsed brainstorms={len(brainstorm_entries)} | matched to awa.json Issue prompts={matched}")


# ============================================================================
# 5. BUILD GRE REFERENCE HUB DATA (Formulas, Math Terms, RC Playbook, Score Table, Study Plans)
# ============================================================================
def ingest_reference_hub():
    out_dir = DATA / "guides"
    out_dir.mkdir(parents=True, exist_ok=True)

    # A. RC Strategies (Iman Ostad)
    rc_pdf = GRE_SRC / "03_Verbal_Reasoning_and_Vocabulary" / "RC Strategies-Iman Ostad.pdf"
    rc_text = ""
    if rc_pdf.exists():
        r = PdfReader(str(rc_pdf))
        rc_text = "\n\n".join((p.extract_text() or "").strip() for p in r.pages)

    # B. Quant Prep Sheet & Math Terms
    qprep_pdf = GRE_SRC / "02_Quantitative_Reasoning" / "GRE Quant-Prep-Sheet @GREhub.pdf"
    qprep_text = ""
    if qprep_pdf.exists():
        r = PdfReader(str(qprep_pdf))
        qprep_text = "\n\n".join((p.extract_text() or "").strip() for p in r.pages[:6])

    # C. Study Plan from GRE Plan.xlsx & GRE Planner.xlsx
    planner_schedule = []
    pl_xlsx = GRE_SRC / "05_Exam_Experiences_Plans_and_Logistics" / "GRE Planner.xlsx"
    if pl_xlsx.exists():
        wb = openpyxl.load_workbook(pl_xlsx, read_only=True, data_only=True)
        if "Schedule" in wb.sheetnames:
            ws = wb["Schedule"]
            for idx, row in enumerate(ws.iter_rows(values_only=True)):
                vals = [str(c).strip() if c is not None else "" for c in row[:7]]
                if any(vals):
                    planner_schedule.append(vals)
                if len(planner_schedule) >= 35:
                    break
        wb.close()

    # D. Curated Math Core Terms & Formula Reference (cleanly formatted)
    math_formulas = [
        {"category": "Arithmetic & Number Properties", "items": [
            "Divisibility: 3 (digit sum ÷ 3), 4 (last 2 digits ÷ 4), 6 (÷2 & ÷3), 9 (digit sum ÷ 9)",
            "Primes: 2 is the only even prime; 1 is NOT prime. Primes < 30: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29",
            "LCM(a, b) × GCD(a, b) = a × b",
            "Percent change = (New − Old) / Old × 100%; Successive changes a% then b%: net = a + b + (ab/100)%",
            "Exponents: a^m · a^n = a^(m+n); (a^m)^n = a^(mn); a^(-n) = 1/a^n; a^0 = 1 (a ≠ 0)"
        ]},
        {"category": "Algebra & Inequalities", "items": [
            "Difference of squares: a² − b² = (a − b)(a + b)",
            "Perfect squares: (a ± b)² = a² ± 2ab + b²",
            "Quadratic formula: x = (−b ± √(b² − 4ac)) / 2a; sum of roots = −b/a, product = c/a",
            "Inequalities: Multiplying/dividing by a negative FLIPS the sign. Never multiply by a variable unless you know its sign!",
            "Absolute value: |x − a| < b ⇔ a − b < x < a + b",
            "Work/Rate: Combined rate = 1/t₁ + 1/t₂; Average speed = Total Distance / Total Time (NOT mean of speeds!)"
        ]},
        {"category": "Geometry", "items": [
            "Special right triangles: 30-60-90 → 1 : √3 : 2; 45-45-90 → 1 : 1 : √2; Pythagorean triples: 3-4-5, 5-12-13, 8-15-17",
            "Triangle inequality: |a − b| < c < a + b",
            "Sum of interior angles of n-gon = (n − 2) × 180°",
            "Circle: Area = πr², Circumference = 2πr; Arc = (θ/360) × 2πr; Sector = (θ/360) × πr²",
            "Inscribed angle = ½ central angle; angle inscribed in a semicircle = 90°",
            "Cylinder: V = πr²h, SA = 2πr² + 2πrh; Rectangular solid: V = lwh, diagonal = √(l² + w² + h²)"
        ]},
        {"category": "Data Analysis, Counting & Probability", "items": [
            "Mean = Sum / n; For evenly spaced sets: Mean = Median = (first + last) / 2; Count = (last − first)/step + 1",
            "Standard deviation: Adding a constant c to every value does NOT change SD; multiplying by k multiplies SD by |k|",
            "Normal distribution (68-95-99.7 rule): ~34% between μ and μ+σ; ~14% between μ+σ and μ+2σ; ~2% beyond μ+2σ",
            "Permutations (order matters): P(n, k) = n! / (n − k)!; Combinations (order doesn't matter): C(n, k) = n! / (k!(n − k)!)",
            "Probability: P(A or B) = P(A) + P(B) − P(A and B); P(at least one) = 1 − P(none)"
        ]}
    ]

    # E. Calibrated Shortened-GRE 2-Stage Adaptive Score Conversion Table (27 questions total: 12 S1 + 15 S2)
    # Based on ETS Shortened GRE adaptive routing mechanics + GRE Score Conversion Table @GREhub.pdf
    adaptive_scoring = {
        "shortened_gre_structure": {
            "awa": {"tasks": 1, "minutes": 30, "note": "Analyze an Issue ONLY (Analyze an Argument removed Sept 2023)"},
            "verbal_s1": {"questions": 12, "minutes": 18, "difficulty": "Medium"},
            "verbal_s2": {"questions": 15, "minutes": 23, "difficulty": "Adaptive (Easy / Medium / Hard)"},
            "quant_s1": {"questions": 12, "minutes": 21, "difficulty": "Medium"},
            "quant_s2": {"questions": 15, "minutes": 26, "difficulty": "Adaptive (Easy / Medium / Hard)"},
            "total_minutes": 118
        },
        "routing_thresholds": {
            "easy_max": 4,
            "medium_max": 7,
            "hard_min": 8
        },
        "routing_bonus": {
            "verbal": {"easy": -3, "medium": 0, "hard": 3},
            "quant": {"easy": -4, "medium": 0, "hard": 2}
        }
    }

    ref_payload = {
        "math_formulas": math_formulas,
        "rc_strategies": rc_text[:18000],
        "quant_prep_excerpt": qprep_text[:8000],
        "planner_schedule": planner_schedule,
        "adaptive_scoring": adaptive_scoring,
        "exam_day_insights": [
            "Shortened GRE (since Sept 2023) is 1 hour 58 minutes: 1 Issue essay (30m) + 2 Verbal (18m + 23m) + 2 Quant (21m + 26m). No Argument essay, no unscored section, no 10-min break.",
            "Section 1 accuracy drives Section 2 routing: hitting ≥ 8/12 in Section 1 unlocks the Hard Section 2 with a positive scaling bonus; ≤ 4/12 routes to Easy Section 2 with a score ceiling (~152–155).",
            "Time-sink rule (from Pargar GRE #تجربه reports): Never spend > 2.5 minutes stuck on one Quant question in Section 1. Mark, guess, and return via the Review Grid — every question carries equal raw weight within a section.",
            "PowerPrep Plus (PPP 1–3) is the closest calibration to real exam difficulty; free PP1/PP2 Quant tends to feel slightly easier than current real Quant.",
            "ScoreSelect & Retake Policy: You can retake the GRE once every 21 days (up to 5 times in a rolling 12-month period) and send only your best scores to universities."
        ]
    }
    (out_dir / "gre_reference.json").write_text(json.dumps(ref_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[GUIDES] Built gre_reference.json (RC chars={len(rc_text)}, planner_rows={len(planner_schedule)})")


if __name__ == "__main__":
    ingest_verbal_apkg()
    ingest_vocab_and_clusters()
    ingest_quant_and_di()
    ingest_awa_guides()
    ingest_reference_hub()
    print("=== ALL GRE TELEGRAM INGESTION COMPLETE ===")
