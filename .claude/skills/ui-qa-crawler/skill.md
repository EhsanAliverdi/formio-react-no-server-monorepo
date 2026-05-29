---
name: ui-qa-crawler
description: Run the token-aware Playwright UI QA crawler for this Angular + Tailwind app. Discovers routes, visits every reachable page at 4 breakpoints, collects console/network errors, runs axe-core accessibility checks, and outputs a compact JSON summary plus screenshots. Run this BEFORE ui-qa-reviewer.
---

# UI QA Crawler Skill

You are running an automated UI quality assurance crawl of the SurveyFlow Angular application.

## What this skill does

This skill drives the Playwright-based crawler that:

1. Discovers all reachable routes (sidebar, header, config, known routes)
2. Visits every reachable page
3. Tests each page at 4 responsive breakpoints
4. Collects console errors and failed network requests
5. Runs axe-core accessibility checks on each page
6. Collects cross-page consistency evidence
7. Saves a compact JSON summary and screenshots

The crawler is intentionally **token-aware** — it does the heavy lifting so the reviewer does not need to load every screenshot or large DOM dumps.

## Pre-flight checks

Before running the crawler, verify:

1. The Angular dev server is running at the configured base URL (default: `http://localhost:4200`)
2. Node.js is available
3. Playwright is installed in `HPA.SurveyFlow.Web`

If Playwright is not installed:

```bash
cd HPA.SurveyFlow.Web
npm install -D @playwright/test @axe-core/playwright
npx playwright install chromium
```

## How to run

```bash
cd HPA.SurveyFlow.Web
npm run qa:ui:crawl
```

Or directly:

```bash
cd HPA.SurveyFlow.Web
npx playwright test tests/ui-qa/ui-qa-crawler.spec.ts --reporter=list
```

With environment variables:

```bash
UI_QA_BASE_URL=http://localhost:4200 \
UI_QA_USERNAME=admin@demo.local \
UI_QA_PASSWORD=Admin1234! \
npx playwright test tests/ui-qa/ui-qa-crawler.spec.ts
```

## Output

After the crawl completes, check:

```
ui-qa-output/
  ui-qa-summary.json          ← compact JSON — feed this to ui-qa-reviewer
  screenshots/
    desktop-1440/
    desktop-1024/
    tablet-768/
    mobile-375/
```

## What to do after the crawl

Once the crawl is complete and `ui-qa-summary.json` exists, run:

```
/ui-qa-reviewer
```

The reviewer skill will read the compact JSON and selected screenshots, then produce a full human-readable report.

## Notes

- Do not modify `ui-qa-summary.json` manually.
- Screenshots are organised by breakpoint and named consistently.
- The JSON only contains counts, short evidence, route references, and screenshot paths — not full DOM or HTML.
- The `recommendedScreenshotsForReview` array in the JSON tells the reviewer which screenshots are worth loading.
- Auth credentials are taken from environment variables — never hardcoded.
- If a route requires auth and credentials are not set, it is marked as `requires-auth` in the coverage report, not silently skipped.
