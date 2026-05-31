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

## Cross-Page Consistency Findings

Group repeated inconsistencies. One heading per pattern where relevant:

- Page headers
- Breadcrumbs/page context
- Primary action placement
- Button styles
- Destructive action styles
- Table patterns
- Table row actions
- Card spacing
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
