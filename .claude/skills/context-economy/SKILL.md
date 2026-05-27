---
name: context-economy
description: Use when exploring, analyzing, debugging, or implementing in a large codebase and token/context usage should stay low. Guides Claude to gather only relevant context, prefer search and bounded reads over full-file ingestion, summarize discoveries, and avoid loading broad unrelated code or logs.
---

# Context Economy

Keep context small while preserving enough evidence to make correct changes.

## Workflow

1. Start with repository shape:
   - Use `rg --files`, targeted `rg`, and directory listings before opening files.
   - Identify the smallest likely ownership area before reading implementation details.
2. Read narrowly:
   - Prefer specific files and bounded sections over whole-file reads.
   - For large files, search for symbols, route names, DTO names, method names, selectors, or error strings first.
   - Avoid loading generated files, migrations, lockfiles, build outputs, logs, and bundled assets unless the task directly requires them.
3. Keep a compact working map:
   - Track the current objective, relevant files, key decisions, and unresolved questions in short bullets.
   - Replace repeated file content with references to paths and symbols.
4. Spend tokens where correctness needs them:
   - Read full contracts, public APIs, security-sensitive code, migrations, and tests when behavior depends on exact details.
   - Re-read changed code before editing or final verification if earlier context may be stale.
5. Report efficiently:
   - Summarize command output instead of pasting long logs.
   - Include only the failing lines, changed files, and verification evidence that matter.

## Repo Hints

- Angular code lives under `HPA.SurveyFlow.Web/src/app`.
- ASP.NET Core API code lives under `HPA.SurveyFlow.Api`.
- Domain contracts live under `HPA.SurveyFlow.Domain`.
- EF Core, jobs, storage, seeding, and services live under `HPA.SurveyFlow.Infrastructure`.
- Docker and deployment overlays live under `HPA.SurveyFlow.Docker`.

Use these boundaries to avoid reading unrelated layers.

