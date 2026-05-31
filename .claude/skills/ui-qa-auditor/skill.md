---
name: ui-qa-auditor
description: Run the full token-aware SurveyFlow UI QA workflow. First runs the Playwright crawler to collect route coverage, responsive, accessibility, console/network, screenshot, and consistency evidence. Then reads the compact JSON plus selected screenshots and writes the final UI QA audit report.
---

# UI QA Auditor Skill

You are running a full automated UI quality assurance audit of the SurveyFlow Angular + Tailwind application.

This skill replaces the older split skills:

* `ui-qa-crawler`
* `ui-qa-reviewer`

The workflow still has two internal phases:

1. **Automated evidence collection**
2. **Token-aware report generation**

Do not skip Phase 1 unless a fresh `ui-qa-output/ui-qa-summary.json` already exists and the user explicitly asks to reuse it.

---

## What this skill does

This skill uses the existing Playwright TypeScript crawler under:

```text
tests/ui-qa/
```

The crawler:

1. Discovers all reachable routes from known routes, sidebar/header links, and app navigation
2. Visits every reachable page
3. Tests each page at 4 responsive breakpoints
4. Captures screenshots
5. Collects console errors
6. Collects failed network requests
7. Runs axe-core accessibility checks
8. Collects cross-page consistency evidence
9. Writes a compact machine-readable JSON summary

Then this skill reads the compact output and writes a human-readable report.

---

## Phase 1 — Automated evidence collection

### Pre-flight checks

Before running the crawler, verify:

1. The Angular dev server is running at the configured base URL, default:

```text
http://localhost:4200
```

2. Node.js is available.
3. Playwright is installed in `HPA.SurveyFlow.Web`.

If Playwright is not installed:

```bash
cd HPA.SurveyFlow.Web
npm install -D @playwright/test @axe-core/playwright
npx playwright install chromium
```

### Run the crawler

Preferred command:

```bash
cd HPA.SurveyFlow.Web
npm run qa:ui
```

Fallback command:

```bash
cd HPA.SurveyFlow.Web
npm run qa:ui:crawl
```

Direct command:

```bash
cd HPA.SurveyFlow.Web
npx playwright test tests/ui-qa/ui-qa-crawler.spec.ts --reporter=list
```

With environment variables:

```bash
UI_QA_BASE_URL=http://localhost:4200 \
UI_QA_USERNAME=admin@demo.local \
UI_QA_PASSWORD=Admin1234! \
npx playwright test tests/ui-qa/ui-qa-crawler.spec.ts --reporter=list
```

Never hardcode credentials. Use environment variables only.

### Phase 1 output

After the crawl completes, confirm this exists:

```text
ui-qa-output/ui-qa-summary.json
```

Screenshots should be saved under:

```text
ui-qa-output/screenshots/
  desktop-1440/
  desktop-1024/
  tablet-768/
  mobile-375/
```

The JSON is the source of truth for the report.

Do not manually modify `ui-qa-summary.json`.

If the crawler fails, do not invent a report. Explain what failed and what needs to be fixed before the audit can continue.

---

## Report screenshot handling

This is a required step in Phase 2. Read it before writing any screenshot paths in the report.

### Where screenshots live

```text
ui-qa-output/screenshots/{breakpoint}/{Label}-{breakpoint}.png   ← raw, gitignored
docs/ui-ux/screenshots/ui-qa/{filename}.png                      ← selected, committed
```

Raw crawler screenshots stay in `ui-qa-output/screenshots/`. They are gitignored and must never be linked directly from the report.

Selected screenshots are **copied** into `docs/ui-ux/screenshots/ui-qa/` before the report is written. Those copied files are committed alongside the report.

### Which screenshots to copy

Copy a screenshot only when it meets at least one of these criteria:

1. It is listed in `recommendedScreenshotsForReview` in `ui-qa-summary.json`, **or**
2. It directly illustrates a Critical or High **UI / UX / Responsive** finding (not accessibility-only findings, unless the issue is visually obvious in the screenshot).

Limit repeated-issue screenshots — maximum 1–3 examples per repeated issue. Prefer the most representative breakpoint.

Do **not** copy every screenshot the crawler produced.

### How to copy screenshots

Use PowerShell to copy selected screenshots. Create the destination directory if it does not exist:

```powershell
$dest = "docs/ui-ux/screenshots/ui-qa"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item "ui-qa-output/screenshots/mobile-375/Admin-Forms-mobile-375.png" "$dest/"
Copy-Item "ui-qa-output/screenshots/desktop-1440/Admin-Forms-desktop-1440.png" "$dest/"
# ... repeat for each selected screenshot
```

Run the copy commands **before** writing the report Markdown so the files exist when VS Code previews the report.

### How to embed screenshots in the report

Use paths **relative to the report file** (`docs/ui-ux/ui-qa-report.md`):

**Correct:**
```md
![Admin Forms mobile table overflow](screenshots/ui-qa/Admin-Forms-mobile-375.png)
```

**Incorrect — do not use raw output path:**
```md
![](../../ui-qa-output/screenshots/mobile-375/Admin-Forms-mobile-375.png)
```

**Incorrect — do not use code span:**
```md
`ui-qa-output/screenshots/mobile-375/Admin-Forms-mobile-375.png`
```

### Required screenshot block format

For every Critical or High UI / UX / Responsive finding, include this block:

```md
**Screenshot evidence**

![Descriptive alt text](screenshots/ui-qa/Filename.png)

_375px mobile — one sentence describing what the image shows._
```

If no screenshot was copied for a finding:

```md
**Screenshot evidence**

Not available from crawler output.
```

Accessibility-only findings (axe violations with no visual component) may omit the screenshot block.

---

## Cross-page visual consistency review

This is a required part of Phase 2. Run it for every admin page after reading the JSON and before writing the report.

The goal is to compare admin pages against a shared layout standard and flag deviations — not just per-page issues but patterns that break across the whole admin shell.

---

### 1. Page shell / layout

For every admin page, note from the desktop-1440 screenshot:

- Where the left edge of the main content starts (relative to the sidebar)
- Whether the content has a consistent max-width or appears narrower/wider than peers
- Whether the page header (title + subtitle + action) sits at the same vertical position as other pages
- Whether the page uses the shared admin content container or something custom

**Flag as Medium** if any admin page shows a noticeably different left margin, max-width, or top offset compared to the majority.

---

### 2. Page header pattern

The expected standard across all admin pages:

```
[Page title — bold, left]          [Primary action — filled button, right]
[Subtitle — gray, left, below title]
[Content area below]
```

Check every admin page for:

- Title present and bold on the left
- Subtitle (if present) directly below the title in a lighter colour
- Primary action on the right at the same vertical level as the title
- Consistent top padding/spacing from the header bar to the page title
- Consistent horizontal alignment of the title across all pages

**Flag as Medium** if title alignment, subtitle presence, or top spacing is inconsistent.

---

### 3. Primary action consistency

Check every admin page for:

- Whether a primary action exists (if the page has a create/add use case, one is expected)
- Whether the primary action uses the shared filled primary button style (`bg-brand-600 text-white rounded-md px-4 py-2`)
- Whether the label follows a consistent pattern (e.g. `+ New {Entity}` or `+ Add {Entity}`)
- Whether icon/plus-sign usage is consistent
- Whether any primary action is rendered as a plain text link instead of a button

**Flag as High** when a primary action is a text link while peer pages use filled buttons. This reduces discoverability.

Example: `+ New Key` on API Keys is a plain text link. `+ New Dataset` and `+ New Category` are filled primary buttons. Flag this as High.

---

### 4. Content container consistency

Classify each admin page into one of:

- **Table page**: Forms, Categories, Submissions, Users, Synced Data, Logs, Audit Log
- **Card-grid page**: Reports, Datasets
- **Settings/form page**: Settings, Integrations, Profile
- **Empty/stub page**: API Keys (empty), Audit Log (empty)

Within each group, check:

- Outer content container width is consistent
- Card/table reaches the same right edge across the group
- Left margin is consistent within the group and similar across groups
- Narrow pages (visibly narrower content than the majority) are flagged unless a layout reason is visible

**Flag as Medium** for inconsistent container widths or margins within the same page type.

---

### 5. Empty state consistency

For every page that can be empty, check the empty state for:

| Element | Expected |
|---------|----------|
| Icon or illustration | Yes — a relevant icon or simple illustration |
| Heading | Yes — a short noun phrase, e.g. "No API keys yet" |
| Explanatory text | Yes — 1–2 sentences describing what this section does |
| Primary CTA | Yes — if the user can create an item from this page |
| Card/border style | Consistent with other empty states |
| Vertical centering | Centred within the content area |

**Flag as Medium** if the empty state is missing the icon, explanatory text, or CTA.

**Flag as High** if the only content is a short text string with no structure, no icon, and no CTA — especially when sibling pages have a structured empty state.

Example: API Keys shows only `"No API keys yet."` inside a plain bordered box with no icon, no description, no CTA. This is inconsistent and weak.

---

### 6. Table / list / card pattern consistency

Compare within each group:

**Table pages** (Forms, Categories, Submissions, Users, Synced Data, Logs):
- Table header row style (background, font weight, border)
- Row padding / density
- Row action button style — outline vs text vs filled
- Destructive action style — should be outlined red, not plain text
- Pagination or load-more pattern (if present)

**Card-grid pages** (Reports, Datasets):
- Card border radius and shadow
- Card padding
- Card action button style (Reports uses large filled "Run" buttons; Datasets uses full-width outline "Edit" + icon delete — flag the mismatch)
- Destructive action in card: Reports uses a trash icon; Datasets uses a trash icon — consistent here

**Flag as Medium** for mismatched action button styles between pages of the same type.

---

### 7. Screenshot-based comparison

After loading screenshots from `recommendedScreenshotsForReview`, also load these desktop-1440 screenshots if they are not already in the set, for the cross-page consistency comparison:

```text
ui-qa-output/screenshots/desktop-1440/Admin-Datasets-desktop-1440.png
ui-qa-output/screenshots/desktop-1440/Admin-Categories-desktop-1440.png
ui-qa-output/screenshots/desktop-1440/Admin-API-Keys-desktop-1440.png
ui-qa-output/screenshots/desktop-1440/Admin-Forms-desktop-1440.png
ui-qa-output/screenshots/desktop-1440/Admin-Users-desktop-1440.png
ui-qa-output/screenshots/desktop-1440/Admin-Reports-desktop-1440.png
```

Load only these 6 for the consistency comparison. Do not load all desktop screenshots.

Copy all 6 to `docs/ui-ux/screenshots/ui-qa/` if not already there.

Embed them in the **Cross-page Visual Consistency Findings** report section as evidence for each finding.

---

### Report section: Cross-page Visual Consistency Findings

Add this section to `docs/ui-ux/ui-qa-report.md` **after** the Executive Summary and before Critical / High Priority Findings, or after it — whichever reads better for the specific run.

Use this structure:

```markdown
## Cross-page Visual Consistency Findings

### Layout comparison — desktop 1440px

![Admin Datasets](screenshots/ui-qa/Admin-Datasets-desktop-1440.png)
_Datasets — card-grid layout, content starts ~300px from left edge, filled "+ New Dataset" primary button._

![Admin Categories](screenshots/ui-qa/Admin-Categories-desktop-1440.png)
_Categories — table layout, content aligns with Datasets, filled "+ New Category" primary button._

![Admin API Keys](screenshots/ui-qa/Admin-API-Keys-desktop-1440.png)
_API Keys — content appears narrower, primary action is a plain text link, empty state has no icon or CTA._

### C-001 — Title

- Severity: High / Medium / Low
- Pattern affected:
- Pages compared:
- Evidence:
- Recommendation:

**Screenshot evidence**

![...](screenshots/ui-qa/...)

_Caption._
```

**Consistency finding severity rules:**

| Severity | When to use |
|----------|-------------|
| High | Primary action style inconsistency that reduces discoverability or task completion |
| Medium | Content container width / alignment / page header pattern inconsistency |
| Medium | Weak or missing empty state (no icon, no CTA, no description) |
| Low | Minor spacing, text, or icon inconsistency that does not affect usability |

---

## Phase 2 — Token-aware report generation

### Token-awareness rules

Read these rules before writing the report:

1. Read only:

```text
ui-qa-output/ui-qa-summary.json
```

2. Load only screenshots listed in `recommendedScreenshotsForReview` (to visually verify findings before writing).
3. Do not load every screenshot in `ui-qa-output/screenshots/`.
4. Do not read raw HTML, full DOM dumps, or full page content.
5. Do not paste large JSON blocks into the report.
6. Group repeated issues.
7. Skip pages with no meaningful findings.
8. Prioritise critical and high severity findings first.
9. Do not claim a page was reviewed unless `routeCoverage` shows `visited: true`.

### Review steps

1. Read `ui-qa-output/ui-qa-summary.json`.
2. Check route coverage.
3. Check breakpoints tested.
4. Check failed/skipped/parameterised routes.
5. Read only selected screenshots listed in `recommendedScreenshotsForReview`.
6. Group repeated issues and identify top risks.
7. **Copy selected screenshots** to `docs/ui-ux/screenshots/ui-qa/` (see the Report screenshot handling section above).
8. Write the final Markdown report with embedded images using relative paths.
9. Save the report to:

```text
docs/ui-ux/ui-qa-report.md
```

---

## Final report structure

Create or update:

```text
docs/ui-ux/ui-qa-report.md
```

Use this structure:

```markdown
# UI QA Audit — {appName}

Generated: {date}
Crawler run: {generatedAt from JSON}

## Audit Scope

| Item | Value |
|------|-------|
| Base URL | |
| Breakpoints tested | |
| Routes discovered | |
| Routes visited | |
| Routes failed/skipped | |
| Axe enabled | |
| Coverage gaps | |

## Executive Summary

Top 5 UX/UI risks in 3–5 sentences.

## Top 10 Fixes in Recommended Order

A practical ordered list of the highest-value fixes, balancing severity, effort, and repeated impact.

## Cross-page Visual Consistency Findings

### Layout comparison — desktop 1440px

![Admin Datasets](screenshots/ui-qa/Admin-Datasets-desktop-1440.png)
_Caption describing layout observed._

![Admin Categories](screenshots/ui-qa/Admin-Categories-desktop-1440.png)
_Caption._

![Admin API Keys](screenshots/ui-qa/Admin-API-Keys-desktop-1440.png)
_Caption._

### C-001 — Title

- Severity:
- Pattern affected:
- Pages compared:
- Evidence:
- Recommendation:

**Screenshot evidence**

![...](screenshots/ui-qa/...)

_Caption._

## Critical / High Priority Findings

For each finding:

**F-001 — Title**
- Severity:
- Type: UI / UX / Responsive / Accessibility / Consistency / Functional
- Affected routes:
- Evidence:
- Recommendation:

**Screenshot evidence**

![Descriptive alt text](screenshots/ui-qa/Filename.png)

_One sentence caption describing what the screenshot shows._

## Cross-page Component Consistency

Group repeated inconsistencies across all pages. One heading per pattern where relevant:

- Page headers
- Breadcrumbs/page context
- Primary action placement and style
- Button styles
- Destructive action styles
- Table patterns and density
- Table row actions
- Card spacing and style
- Badge colours
- Form input styles
- Date input styles
- Empty state patterns
- Save button location
- Sidebar/header behaviour

## Responsive Findings

### Mobile (375px)

### Tablet (768px)

### Desktop (1024px)

### Large Desktop (1440px)

## Accessibility Findings

Group by severity and axe rule.

Include:

- Rule ID
- Severity
- Affected route count
- Example route
- Example element/selector
- Recommended fix

## Page-Specific Findings

Only include pages with unique findings not already covered above.

Do not write sections for pages with no meaningful issues.

## Design System Recommendations

Give practical reusable rules for:

- Buttons
- Destructive actions
- Tables and responsive table behaviour
- Cards
- Forms
- Date inputs
- Badges
- Empty states
- Page headers
- Sticky save/action bars
- Semantic landmarks

## Prioritised Fix Plan

### Quick wins (< 1 hour each)

### High-impact fixes (1–4 hours each)

### Larger redesign items

## Coverage Gaps

List routes that were discovered but not visited, with reason.

For dynamic routes, recommend how to seed or discover valid IDs in the next run.
```

---

## Severity rules

Use this severity mapping:

### Critical

Use for:

* Broken navigation
* Task-blocking UI failure
* Hidden or unreachable primary action
* Serious accessibility issue blocking form use or navigation
* Page cannot load

### High

Use for:

* Major responsive issue affecting important pages
* Accessibility issue affecting multiple pages or important controls
* Table/action overflow that prevents users completing work
* Serious consistency issue that increases risk, such as destructive actions

### Medium

Use for:

* Structural accessibility warnings
* Repeated consistency issues
* Performance warnings
* Missing helpful UI patterns
* Awkward layout that does not block task completion

### Low

Use for:

* Polish issues
* Copy/text issues
* Minor visual inconsistency
* Minor metadata issues such as browser title

---

## Output rules

The final chat response should be concise.

After creating the report, summarise only:

* whether the crawler ran successfully
* number of routes visited
* number of critical/high findings
* report path
* top 3 issues

Do not paste the full report into chat unless the user asks.

---

## Important reminders

* Use the crawler's JSON as the source of truth.
* Do not invent findings not supported by evidence.
* Do not write long analysis for pages with zero findings.
* Do not read all screenshots — only those in `recommendedScreenshotsForReview`.
* `ui-qa-output/` is raw generated evidence and is gitignored — never link to it from the report.
* Copy only selected screenshots to `docs/ui-ux/screenshots/ui-qa/` before writing the report.
* Embed screenshots in the report using relative paths: `![alt](screenshots/ui-qa/...)`.
* `docs/ui-ux/screenshots/ui-qa/` is committed alongside the report — do not gitignore it.
* `docs/ui-ux/ui-qa-report.md` is the final report and is committed.
