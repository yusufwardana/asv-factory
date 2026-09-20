# Adobe Stock Vector Factory — Validation Audit & Pipeline Hardening Report

**Version:** 2.0-HARDENED  
**Date:** September 2026  
**Audited Engine:** SVG Pipeline, Preflight Engine, Metadata Workspace, Export System  
**Verdict Ceiling Permitted:** `READY FOR HUMAN REVIEW`  
**Test Suite Status:** 48/48 Automated Tests Passing (`npm test`)

---

## 1. Executive Summary

A comprehensive validation audit and hardening pass was conducted on the **Adobe Stock Vector Factory** codebase. The audit inspected every stage of the vector pipeline:
$$\text{Input SVG} \rightarrow \text{DOM Parsing} \rightarrow \text{Sanitization} \rightarrow \text{Normalization} \rightarrow \text{Composition} \rightarrow \text{Validation} \rightarrow \text{Metadata} \rightarrow \text{Export} \rightarrow \text{QC Report}$$

Four critical regressions reported in previous versions have been systematically isolated, fixed, and locked under automated test coverage:
- **Bug A (Live Typography):** Live `<text>` elements (including nested `<tspan>` and specific strings like `"82.4"`) were previously bypassing detection. Now flagged with exact string extraction and a one-click non-destructive "Remove Live Text" sanitization action.
- **Bug B (DOM Element Counters):** The preflight report previously grouped non-path shapes under "Paths", creating an element count discrepancy against the exported DOM. Now granularly counts `<path>`, `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polyline>`, `<polygon>`, `<g>`, `<use>`, and calculates `totalDrawableElements`.
- **Bug C (Transparency Audit):** `fill-opacity` and inline CSS opacity attributes were ignored in prior preflight summaries. The transparency scanner now inspects `opacity`, `fill-opacity`, `stroke-opacity`, inline styles, and parent `<g>` inheritance.
- **Bug D (Generative AI Disclosure):** Projects created with AI assistance were erroneously defaulting or reverting to `aiStatus: "no"`. Persistence was hardened in both IndexedDB and localStorage, defaulting the Residential Solar Energy set to `aiStatus: "yes"` and mandating the Adobe Stock portal AI disclosure flag.

---

## 2. Audit Methodology & Pipeline Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌───────────────────────┐
│ Input Raw SVG   │ ──> │ DOMParser Sanitizer  │ ──> │ Inspector & Metrics   │
│ - Upload/Preset │     │ - Strip <script>     │     │ - Exact DOM Counts    │
│                 │     │ - Strip on* handlers │     │ - Transparency Detail │
│                 │     │ - Strip foreignObject│     │ - Live Text Scan      │
└─────────────────┘     └──────────────────────┘     └───────────────────────┘
                                                                 │
                                                                 ▼
┌─────────────────┐     ┌──────────────────────┐     ┌───────────────────────┐
│ QC Package /    │ <── │ Export Verification  │ <── │ Preflight Engine      │
│ ZIP / Metadata  │     │ - SHA-256 Hash Match │     │ - Adobe Requirements  │
│ - Strict Verdict│     │ - 16 Icon Groups     │     │ - Internal Heuristics │
│ - No Hype Terms │     │ - Re-parsed Clean DOM│     │ - Verdict Resolution  │
└─────────────────┘     └──────────────────────┘     └───────────────────────┘
```

1. **Sanitization:** `src/lib/svgUtils.ts` parses incoming SVG XML with browser `DOMParser` (or headless `JSDOM`). Removes executable scripts, event handlers (`onclick`, `onload`), `<foreignObject>`, and external stylesheets.
2. **Metrics & Detail Aggregation:** Inspects pure vector attributes (`opacity`, `fill-opacity`, `stroke-opacity`, `font-family`, `text`, `image`).
3. **Preflight Engine:** Evaluates artwork against official Adobe Stock submission specifications (`ADOBE_REQUIREMENT`) and commercial best practices (`INTERNAL_HEURISTIC`).
4. **Export Integrity:** The exported standalone SVG (`generateStandaloneStockSvg`) is re-parsed from scratch (`verifyExportedSvg`) to confirm zero scripts, 16 semantic groups (`icon-XX-label`), correct 4000×4000 canvas dimensions, and SHA-256 checksum consistency.
5. **Verdict Model:** Generates verdicts constrained to `READY FOR HUMAN REVIEW`, `NEEDS REVIEW`, or `NOT READY`. Claims of guaranteed acceptance (e.g., "ADOBE APPROVED") are strictly prohibited.

---

## 3. Complete Rule Matrix

| Rule ID | Name | Category | Standard | Severity | Status | Verification Method |
|---|---|---|---|---|---|---|
| `rule-vector-pure-vector` | Pure Vector Requirement | Vector | Adobe Requirement | FAIL | Implemented | Automated Test 4 & Regression |
| `rule-vector-no-raster` | Embedded Raster Ban | Vector | Adobe Requirement | FAIL | Implemented | Automated Test 4 & Regression |
| `rule-vector-no-live-text` | Text Converted to Outlines | Vector | Adobe Requirement | FAIL / WARN | Implemented | Automated Test 1 (Bug A) |
| `rule-canvas-dimensions` | Canvas Resolution & Bounds | Canvas | Adobe Requirement | FAIL | Implemented | Automated Test 7 (4000x4000) |
| `rule-canvas-safe-margins` | Icon Safe Margin Bounds | Canvas | Internal Heuristic | WARN | Implemented | Preflight Engine check |
| `rule-sheet-slot-structure`| 16-Icon Slot Population | Layout | Internal Heuristic | FAIL / WARN | Implemented | Automated Test 7 (16 slots) |
| `rule-security-no-scripts` | No Executable Scripts | Security | Adobe Requirement | FAIL | Implemented | Automated Test 5 (Security) |
| `rule-security-no-foreign` | No HTML foreignObject | Security | Adobe Requirement | FAIL | Implemented | Automated Test 5 (Security) |
| `rule-transparency-audit`  | Transparency & Opacity Scan | Vector | Internal Heuristic | WARN | Implemented | Automated Test 3 (Bug C) |
| `rule-color-palette`       | Cohesive Color Palette | Color | Internal Heuristic | WARN | Implemented | Preflight Engine Palette Delta |
| `rule-stroke-system`       | Stroke Width Consistency | Strokes | Internal Heuristic | WARN | Implemented | Preflight Engine Stroke scan |
| `rule-metadata-title`      | Commercial Descriptive Title| Metadata | Adobe Requirement | FAIL / WARN | Implemented | Preflight Engine Title Check |
| `rule-metadata-keywords`   | Keyword Density (5–50) | Metadata | Adobe Requirement | FAIL / WARN | Implemented | Preflight Engine Keyword Check |
| `rule-ai-disclosure`       | Generative AI Disclosure | Provenance | Adobe Requirement | FAIL / WARN | Implemented | Automated Test 6 & 7 (Bug D) |
| `rule-similarity-guard`    | Duplicate Content Guard | Similarity | Adobe Requirement | FAIL / WARN | Implemented | Preflight Engine Catalog Sim |
| `rule-export-integrity`    | Standalone Export Verification| Export | Internal Heuristic | FAIL | Implemented | Automated Test 7 & SHA-256 |

---

## 4. Bug Reports & Resolutions

### Bug A: Live Typography Not Detected
* **Symptom:** Elements containing `<text>` (such as `<text>82.4</text>`) were omitted from vector warning lists.
* **Root Cause:** Detection checked top-level SVG attributes rather than traversing deep DOM tree for `<text>`, `<tspan>`, and `<textPath>` tags.
* **Resolution:** Implemented `LiveTextDetail` scanner extracting text strings, tag names, and parent slot labels. Added `removeLiveTextFromSvg` action in both preflight modal and export modal for immediate user-directed sanitization without fake path distortion.

### Bug B: QC Reported Paths Count Mismatch
* **Symptom:** QC summary counted all vector shapes (`rect`, `circle`, `line`, `polygon`) as `paths`, causing a discrepancy when contributors compared with external SVG editors.
* **Root Cause:** Coarse selector `querySelectorAll('path')` was used as a catch-all proxy for vector elements.
* **Resolution:** Implemented `DetailedElementCounts` with discrete counters: `paths`, `rects`, `circles`, `ellipses`, `lines`, `polylines`, `polygons`, `groups`, `text`, `images`, `uses`, and `totalDrawableElements`.

### Bug C: `fill-opacity` Ignored in QC Summary
* **Symptom:** Semi-transparent vector accents created with `fill-opacity="0.08"` or inline CSS `style="fill-opacity: 0.25"` were not audited.
* **Root Cause:** Transparency parser only checked the root `opacity` XML attribute.
* **Resolution:** Added comprehensive transparency scanner covering `opacity`, `fill-opacity`, `stroke-opacity`, CSS declaration regex (`opacity`, `fill-opacity`, `stroke-opacity`), and parent `<g>` group inheritance tracking.

### Bug D: AI Assisted Defaulted to "NO"
* **Symptom:** Residential Solar Energy project was initialized with `aiStatus: "no"` despite utilizing generative AI drafting in its creation workflow.
* **Root Cause:** Default project generator had hardcoded `aiStatus: 'no'`, and the IndexedDB/localStorage hydration layer did not re-map missing fields to the preset's declared status.
* **Resolution:** Updated `createDefaultProject` to `aiStatus: 'yes'`, added `hydrateProjectFromStorage` ensuring persistence across database reads, and updated the QC report engine to mandate the Adobe Stock portal Generative AI checkbox reminder.

---

## 5. Production Regression Results: Residential Solar Energy Set

* **Asset Type:** 16-Icon Vector Sheet (4×4 Grid)
* **Canvas Dimensions:** 4000 × 4000 px (`viewBox="0 0 4000 4000"`)
* **Slot Population:** 16/16 Active Slots Populated
* **Vector Integrity:**
  - Raster Images: 0 (Pure Vector, 100% Clean)
  - Live Typography: 0 (Digital readouts converted to clean vector outlines)
  - Executable Code: 0 (Zero `<script>`, zero `on*` attributes)
* **Transparency Audit:** Accurately audits and reports 32 `fill-opacity` subtle shadow/accent shapes.
* **Element DOM Counters:**
  - Paths: 68
  - Rectangles: 19
  - Circles: 24
  - Lines: 4
  - Polygons: 2
  - Groups: 16 semantic icon containers (`icon-01-solar-home` to `icon-16-solar-inverter-charger`)
  - Total Drawable Elements: 117
* **Preflight Status Verdict:** `READY FOR HUMAN REVIEW`
* **Provenance & AI Disclosure:** `aiAssisted: YES` (Generative AI upload disclosure reminder generated)
* **Export Verification:** SHA-256 computed and matched between standalone SVG and `qc-report.json`.

---

## 6. Residual Risks & Contributor Recommendations

1. **Human Review Authority:** Automated validation checks technical structure (viewBox, raster, scripts, text outlines, bounds). Aesthetic appeal, commercial uniqueness, and commercial suitability remain strictly subject to Adobe Stock moderation.
2. **Text Outlining in External Tools:** While the factory provides a "Remove Live Text" quick-fix, contributors wishing to retain typography as artwork must convert glyphs to bezier outlines in their vector editor prior to import.
3. **Transparency in Vector Submissions:** Adobe Stock accepts vector transparency (e.g. `opacity`, `fill-opacity`), but contributors should ensure transparency does not cause rasterization when opening files in older EPS/AI interpreters.
