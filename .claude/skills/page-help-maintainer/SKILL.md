---
name: page-help-maintainer
description: Create or update SurveyFlow pages together with centralized, evidence-backed slide-panel help. Use when adding a page, extending page controls, changing business logic that affects user guidance, reviewing stale help, replacing tooltip-only help, or wiring reusable help icons and grouped action help in the SurveyFlow UI.
---

# Page Help Maintainer

Keep SurveyFlow help accurate while creating or changing pages.

## Core Rules

- Do not invent behavior. Trace source code before writing help.
- Store help text centrally in `HPA.SurveyFlow.Web/src/app/shared/help/help.catalog.ts`.
- Access help by stable key through `<app-help-trigger helpKey="...">`.
- Do not place long help text in page templates.
- Use the shared slide panel. Do not introduce hover-only explanatory help.
- Add a user-understandable example when a setting, workflow, rule, mapping, or business outcome is not obvious.
- Keep examples consistent with actual supported values and execution paths.
- If behavior cannot be proven from the repository, omit the claim or ask for clarification.

## Existing Architecture

Read these files before editing:

- `HPA.SurveyFlow.Web/src/app/shared/help/help.catalog.ts`
- `HPA.SurveyFlow.Web/src/app/shared/help/help-resolver.service.ts`
- `HPA.SurveyFlow.Web/src/app/shared/help/help-trigger.component.ts`
- `HPA.SurveyFlow.Web/src/app/shared/help/help-content.component.ts`
- `HPA.SurveyFlow.Web/src/styles.css`

Use:

```html
<app-help-trigger helpKey="admin.example.setting" label="Help for example setting" />
```

For an action button, keep the action and its help icon in one shared button group:

```html
<div class="ta-btn-group">
  <button type="button" class="ta-btn-group-action">Import JSON</button>
  <app-help-trigger
    helpKey="admin.forms.import-json"
    label="Help for importing form JSON"
    [grouped]="true"
  />
</div>
```

## Workflow

### 1. Inventory The Page

Read the page template, component logic, nested reusable components, routes, and API services.

List:

- Page purpose and entry route.
- Sections, fields, toggles, selectors, actions, dialogs, table columns, status badges, and empty states.
- Nested components that expose user-configurable behavior.
- Existing `title`, `cursor-help`, tooltip, or hover-only explanatory content.
- Existing help keys that can be reused.

### 2. Build An Evidence Map

For every proposed help topic, identify the source of truth:

- UI behavior: Angular template and component TypeScript.
- Persisted settings: API controller, DTO, domain entity, or database mapping.
- Runtime effect: backend service, executor, evaluator, or public form runtime.
- Allowed values and defaults: model types, initialization code, and normalization code.
- Error or skip behavior: guards, validation, exception handling, and logs.

Do not infer an external system guarantee from a UI label alone.

### 3. Write Centralized Topics

Add stable, scoped keys to `HELP_CATALOG`.

Prefer:

```ts
'admin.forms.visibility'
'admin.form.notification-rules'
'admin.categories.card-layout'
```

Write help in this order when relevant:

1. Plain-language summary.
2. Where the setting or data comes from.
3. What happens when the user changes it.
4. Important defaults, validation, or skip behavior.
5. A concrete example.
6. A short note for a non-obvious risk.

Use examples for:

- Conditional logic and groups.
- Integrations, mappings, and webhooks.
- Notification recipients and placeholders.
- Visibility, permissions, workflow outcomes, and destructive actions.
- Any feature where a user could configure a valid-looking but ineffective value.

Avoid examples for trivial controls when they add no useful information.

### 4. Wire Help At The Point Of Use

- Add `HelpTriggerComponent` to standalone component imports.
- Place a help trigger beside each meaningful label or section.
- Reuse one topic key when several controls represent the same concept.
- Add a dedicated topic when controls have materially different behavior.
- Put button-owned help inside `.ta-btn-group`.
- Keep the info button click isolated from the surrounding row, label, or action.
- Replace tooltip-only explanations with slide-panel help or visible text.

### 5. Audit Help After Logic Changes

Whenever business logic or a page changes:

1. Search for help keys used by the changed page and its nested components.
2. Read the matching catalog topics.
3. Compare every claim, default, option, example, and warning against the updated source.
4. Update or remove stale guidance in the same change.
5. Add help for newly exposed user controls.
6. Search for hover-only explanations introduced by the change.

Treat stale help as a behavioral regression.

## Required Checks

Run focused searches:

```powershell
rg -n "app-help-trigger|helpKey|title=|cursor-help|group-hover:opacity" HPA.SurveyFlow.Web/src/app
rg -n "admin\." HPA.SurveyFlow.Web/src/app/shared/help/help.catalog.ts
```

Run validation:

```powershell
git diff --check
cd HPA.SurveyFlow.Web
npm run build
```

Run focused tests when they exist. If the repository test suite has an unrelated existing failure, report it precisely.

Before committing, review the diff and confirm:

- Catalog text is centralized.
- Every claim has source evidence.
- Complex topics include a useful example.
- Button help uses the global button-group classes.
- No explanatory help depends only on mouse hover.
- Page and business-logic changes did not leave stale help behind.
