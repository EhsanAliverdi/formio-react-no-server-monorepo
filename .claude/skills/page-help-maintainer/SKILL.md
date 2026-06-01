---
name: page-help-maintainer
description: Create or update SurveyFlow pages with centralized, evidence-backed slide-panel help. Use for new pages, changed controls, changed business logic, stale-help audits, tooltip removal, or reusable help-icon wiring. Keep context usage small: inspect only changed surfaces first and load the detailed checklist only when needed.
---

# Page Help Maintainer

Keep help accurate without loading unnecessary context.

## Minimal Workflow

1. Read the changed page and directly used components.
2. Trace backend or runtime code only for claims about behavior, defaults, validation, permissions, or side effects.
3. Reuse or add stable keys in `HPA.SurveyFlow.Web/src/app/shared/help/help.catalog.ts`.
4. Wire `<app-help-trigger helpKey="...">` beside meaningful controls.
5. Audit help keys affected by the code change.
6. Run focused searches, `git diff --check`, and `npm run build`.

## Rules

- Do not invent behavior. Omit unproven claims or ask for clarification.
- Keep help text in the catalog, not page templates.
- Use the shared slide panel. Do not add hover-only explanatory help.
- Add concise examples for non-obvious workflows, rules, mappings, permissions, and outcomes.
- Put button-owned help in `.ta-btn-group` with `[grouped]="true"`.
- Reuse a topic when controls share meaning; create a new key when behavior differs.
- Treat stale help after a page or business-logic change as a regression.
- Avoid broad repository reads. Expand scope only when direct dependencies do not prove the behavior.

## Existing Pattern

```html
<app-help-trigger helpKey="admin.example.setting" label="Help for example setting" />
```

For button-owned help:

```html
<div class="ta-btn-group">
  <button type="button" class="ta-btn-group-action">Action</button>
  <app-help-trigger helpKey="admin.example.action" label="Help for action" [grouped]="true" />
</div>
```

## Required Checks

```powershell
rg -n "app-help-trigger|helpKey|title=|cursor-help|group-hover:opacity" HPA.SurveyFlow.Web/src/app
git diff --check
cd HPA.SurveyFlow.Web
npm run build
```

Read [references/detailed-checklist.md](references/detailed-checklist.md) only for a new or broad page, unfamiliar business logic, a stale-help audit, or when the minimal workflow leaves uncertainty.
