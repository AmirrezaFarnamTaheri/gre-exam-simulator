# GRE Exam Simulator Design Direction (`DESIGN.md`)

## Identity & Mood
- **Concept:** Scholarly Exam Desk. Calm, print-inspired clarity designed for 2-hour timed analytical reading and quantitative problem solving without glare or decorative noise.
- **Dials:** ENERGY 2 (measured academic contrast) / RHYTHM 2 (a large entry area, text-led subject links, and separate progress tables) / MOTION 1 (crisp focus/hover state transitions only; zero decorative loops).

## Verified Palette (WCAG AA >= 4.5:1 Normal Text, >= 3.0:1 UI Boundaries)
- **Light Mode (Default):**
  - Ground: `#F8F7F4` (warm archival paper)
  - Card Surface: `#FFFFFF`
  - Primary Ink: `#171A1F` (16.28:1 on ground, 17.44:1 on card)
  - Muted Ink: `#4B5563` (7.05:1 on ground, 7.56:1 on card)
  - Structural Primary (ETS Navy): `#183654` (white text 12.39:1)
  - Deliberate Accent (Burnt Ochre): `#9A4306` (white text 6.60:1)
  - Semantic Success / Error: `#14532D` on `#DCFCE7` (8.30:1) / `#991B1B` on `#FEE2E2` (6.80:1)
- **Dark Mode (Toggleable):**
  - Ground: `#11151B`
  - Card Surface: `#181E26`
  - Primary Ink: `#F1F5F9` (16.71:1 on ground, 15.30:1 on card)
  - Muted Ink: `#A3B1C2` (7.68:1 on card)
  - Primary Action: `#7DD3FC` with `#0F172A` ink (10.71:1)
  - Warm Highlight on Navy: `#FCD34D` on `#183654` (8.59:1)

## Navigation

The home page starts mixed practice or opens a specific subject. The header links to Practice, Tests, Learn, and Progress. Progress includes missed questions, topic accuracy, and backups. Timed tests use their own toolbar and results pages.

## Typography & Layout
- **Reading & Math Stems:** `Georgia, Cambria, "Times New Roman", serif` (matches authentic GRE reading/math typography).
- **UI & Controls:** `"Segoe UI", system-ui, -apple-system, sans-serif`.
- **Timers, Scores, Numeric Inputs:** `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
- **Breakpoints:** Below `660px`, the primary links move to a second header row and the home page stacks in one column. On wider screens, the practice list sits beside tests, guides, and review. The workspace stays within `1080px`.
