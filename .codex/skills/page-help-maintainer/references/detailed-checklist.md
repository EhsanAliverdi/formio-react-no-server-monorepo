# Detailed Checklist

Load this only when the compact workflow is insufficient.

## Inventory

- Identify route, sections, fields, toggles, actions, dialogs, tables, badges, and empty states.
- Inspect nested configurable components.
- Search for existing help keys and hover-only explanations.

## Evidence

For each help claim, inspect only the relevant source:

- UI behavior: Angular template and component.
- Persistence: controller, DTO, entity, or mapping.
- Runtime effects: evaluator, executor, service, or public runtime.
- Defaults and options: types, initialization, and normalization.
- Failure behavior: guards, validation, exception handling, and logs.

Do not infer external-system guarantees from UI labels.

## Topic Content

Include only relevant items:

1. Plain-language summary.
2. Source or origin of data when users may wonder where it comes from.
3. Runtime effect.
4. Defaults, validation, or skip behavior.
5. A concise example for non-obvious configuration.
6. A short risk note when needed.

## Wiring

- Add `HelpTriggerComponent` to standalone imports.
- Place triggers at the point of use.
- Use visible text or slide help instead of explanatory tooltips.
- Keep info-button clicks isolated from parent labels, rows, and actions.

## Maintenance Audit

When page or business logic changes:

1. Find help keys used by changed files and direct dependencies.
2. Compare catalog claims, defaults, options, examples, and warnings with updated behavior.
3. Update stale topics and add help for new controls.
4. Search changed surfaces for hover-only explanations.
5. Run focused tests when available and report unrelated failures precisely.
