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
- For input-field-adjacent help use `.ta-input-group` wrapper with `[inputGrouped]="true"`.
- Reuse a topic when controls share meaning; create a new key when behavior differs.
- Treat stale help after a page or business-logic change as a regression.
- Avoid broad repository reads. Expand scope only when direct dependencies do not prove the behavior.
- **Do not over-trigger.** Self-explanatory labels (Edit, Delete, Cancel, plain text badges) do not need individual help icons. Consolidate card-level actions under a single help trigger on the card title instead.

## Page-Title Help Standard

The help trigger on a page heading (`<h1>`) is the primary help entry point for the whole page. It must be written as a **complete end-user guide**, not a one-liner summary. Always include:

1. **What is this page?** — plain-language explanation of the concept and why it exists.
2. **How to get started / step-by-step** — bullet walkthrough of the most common first task.
3. **Key workflows** — one section per non-obvious workflow (running, filtering, editing, etc.).
4. **Status indicators / badges** — explain every badge or icon that can appear and what action to take.
5. **Permissions / visibility note** — if the page or items on it have access controls, explain them in a `note`.

### ❌ Too brief (do not write like this)

```ts
'admin.example.list': {
  title: 'Example',
  summary: 'Manage and run saved example items.',
  sections: [
    { heading: 'Example items', paragraphs: ['An item belongs to one form.'] },
    { heading: 'Outdated items', paragraphs: ['A badge appears when the schema changed.'] },
  ],
},
```

### ✅ Correct standard

```ts
'admin.example.list': {
  title: 'Example',
  summary: 'Plain-language hook — what this page does and why a user would come here.',
  sections: [
    {
      heading: 'What is an example item?',
      paragraphs: [
        'Full explanation of the concept in user terms.',
        'Second paragraph if needed.',
      ],
    },
    {
      heading: 'How to create your first item',
      bullets: [
        'Step one — what to click.',
        'Step two — what to fill in.',
        'Step three — what happens after saving.',
      ],
    },
    {
      heading: 'Using the item',
      paragraphs: ['What clicking Run / Open / View actually does and what the user sees.'],
    },
    {
      heading: 'Organising items',
      bullets: ['Favourites, categories, tags, search — one bullet per feature.'],
    },
    {
      heading: 'Status badge name',
      paragraphs: ['What causes it, whether it blocks anything, and how to resolve it.'],
    },
    {
      note: 'Permissions or visibility note if applicable.',
    },
  ],
},
```

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
