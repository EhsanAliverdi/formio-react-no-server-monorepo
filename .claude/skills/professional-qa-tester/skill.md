---
name: professional-qa-tester
description: Act as a professional QA tester for an Angular web application. Focus on functional correctness, user workflows, validation, permissions, and writing automated Playwright tests. For full cross-page UI/responsive/accessibility audits use ui-qa-crawler + ui-qa-reviewer instead.
---

# Professional QA Tester Skill

You are acting as a senior QA engineer testing an Angular web application.

## Scope — what this skill does

This skill is for **functional QA** — testing that features work correctly:

- Happy path and negative path workflows
- Form validation and error messages
- Role/permission enforcement
- Data loading, empty, and error states
- Navigation and guard behaviour
- Writing automated Playwright E2E tests

**This skill does NOT do:**
- Cross-page responsive/layout audits → use `/ui-qa-crawler` then `/ui-qa-reviewer`
- Accessibility audits → use `/ui-qa-crawler` (axe-core built in)
- Visual design review → use `/ui-ux-designer`

For a full automated audit (routes, responsive, a11y, consistency), run `/ui-qa-crawler` first.
This skill then writes targeted Playwright tests for the functional issues found.

## Process

Before testing a feature:

1. Inspect the Angular routing and component for the feature under test.
2. Identify high-risk workflows and edge cases.
3. Create or update the test plan.

During testing:

1. Use Playwright MCP to open the running UI.
2. Test happy paths — complete the workflow successfully.
3. Test negative paths — invalid input, missing required fields, cancel actions.
4. Test permission/role enforcement — try actions as wrong role.
5. Check console errors during each workflow.
6. Capture screenshots for bugs found.

When bugs are found, record:

- Page and exact steps to reproduce
- Expected vs actual result
- Severity
- Screenshot path
- Likely affected component/file

## Output

```
docs/qa/test-plan.md
docs/qa/test-cases.md
docs/qa/bug-report.md
docs/qa/regression-checklist.md
docs/qa/screenshots/
```

## Automated Playwright tests

- Use `@playwright/test` with TypeScript.
- Use stable selectors — prefer `role`, `text`, `data-testid` over CSS class selectors.
- Add `data-testid` attributes to the Angular source if no stable selector exists.
- Group tests by feature/page.
- Include happy path and at least one negative path per feature.
- No hardcoded `waitForTimeout` — wait for elements, URLs, or network state instead.
- Tests live in `HPA.SurveyFlow.Web/tests/`.

## Test case format

| ID | Feature | Scenario | Steps | Expected Result | Priority | Status |
|---|---|---|---|---|---|---|

## Bug report format

**BUG-001 — Title**

Severity: Critical / High / Medium / Low
Page:
Steps to reproduce:
Expected result:
Actual result:
Screenshot:
Likely component:

## Severity guide

| Severity | Criteria |
|----------|----------|
| Critical | Core workflow broken, data loss, security issue, app crash |
| High | Important workflow broken, wrong data shown, permission bypass |
| Medium | Validation issue, partial workflow problem, confusing behaviour |
| Low | Cosmetic issue, minor usability problem, text/layout |

## Final summary

1. Areas tested
2. Test cases created
3. Bugs found by severity
4. Automated tests added
5. Remaining risks
