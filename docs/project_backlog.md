---
name: project-backlog
description: Outstanding backlog items and known issues for the formio-react monorepo project
metadata: 
  node_type: memory
  type: project
  originSessionId: 79d95764-65e8-4451-a643-c242775b7cd8
---

# Project Backlog

## UX / Error Handling

- **Health check — empty screen when backend is down**: ✅ Done — styled "Server Unavailable" screen with retry button.
- **4xx / 5xx error pages**: ✅ Done — 404, 403, 500, offline, and maintenance pages wired into router with global HTTP interceptor.
- **Under-maintenance page**: ✅ Done — maintenance error page added.
- **Alert / dialog styling**: ✅ Done — branded confirmation dialogs replace all `window.confirm()` calls; app design system used throughout.
- **Placeholder / favicon flash on load**: Sometimes — especially when the DB is unavailable — the app briefly shows unfilled placeholders (favicon, logo, etc.). This also occurs intermittently when both backend and DB are running. Root cause unknown; needs investigation.

## UI / Branding

- **Logo on login page**: The login page is missing the site logo. ✅ Done
- **PDF form generator — reusable branded component**: The PDF export is visually inconsistent and ugly. Needs a reusable, template-based component that uses the site logo and is consistent across all forms. ✅ Done

- **Category view page — fully configurable display**: ✅ Done — the pre-start / category page layout and card display are controlled at the Category level. Includes:
  - **Layout**: List view vs. Card view toggle (configurable per category)
  - **Grid density**: Number of columns / cards per row
  - **Page header**: Show/hide category name (title), show/hide category description. ✅ Done — category header renders saved title, description, and optional image/icon settings.
  - **Card-level display** (all at category level, not form level):
    - Show/hide card title (form name)
    - Show/hide card description (form's `publicDescription`)
    - Show/hide button; button label text
    - Full-card vs. compact card style
  - **Form-level fields** (kept on form, NOT moved to category):
    - Card image (per-form photo)
    - Card description (`publicDescription` — shown or hidden based on category setting)
  - **Migration**: ✅ Done — category display settings moved from form-edit Styles to the Category admin page.
  - **BUG — Category display config not respected**: ✅ Done — `/category/:slug` honours saved category layout, grid, card, page-header, and pagination settings at runtime.
  - **Pagination on Category View page**: ✅ Done — category pages paginate assigned forms using the category-level items-per-page setting.
  - **Category editor save contract**: ✅ Done — Angular snake_case payloads map correctly to the API update DTO. Covered by a regression test and browser save/restore verification.

## Forms & Integrations

- **Form submissions show only one integration ID**: ✅ Done — submission rule activity log records every integration and notification triggered per submission.
- **Form-level error visibility for end users**: ✅ Done — `POST /api/forms/{formId}/field-check` detects duplicate reports for a field value within a configurable time window (default 24 h). Returns a human-readable message and actions already taken (MEX, email, webhook); formio's custom validation URL feature displays the warning to the user before submit.

## Access Control

- **User role assignment — missing roles**: ✅ Done — `GET /api/users/roles` now returns all distinct roles from DB merged with base set; all roles appear dynamically in Add User and form-edit pickers.
- **Form category management — public vs. restricted**: ✅ Done — categories table has `visibility` flag; admin Categories page shows visibility badge and manages it.

## UI Consistency & Dark/Light Mode

- **No centralised CSS design system**: All shared styles (colours, text, buttons, tables, cards) are scattered. Need a single centralised location (e.g. a global stylesheet or design-token file) where these are defined once and applied everywhere. Changes to theme should propagate from one place.
- **Dashboard cards ignore dark mode**: ✅ Done — dashboard stat cards now use shared card styling and theme-aware colours; activity feed text, dividers, and avatar fallback also adapt to dark mode.
- **Admin Forms, Sync Data, and Logs dark mode**: ✅ Done — tables, filters, controls, and page text now use theme-aware styling.
- **Text colours not theme-aware globally**: Text colours across all pages are hardcoded and do not respond to dark/light mode switching. Should be driven by global CSS variables/tokens.
- **Table styles not centralised**: ✅ Done for core admin tables — shared table shell, header, row, cell, and pagination utilities added. Categories, Users, Submissions, and Audit Log now use the shared theme-aware table styles.
- **Button and tag visual inconsistency**: Buttons and tags vary in colour, style, and size across pages. Need a single source of truth for all button variants so every page is consistent.
- **Dark mode / light mode support (all pages)**: ✅ Done — dashboard, Forms, Sync Data, Logs, Categories, Users, Submissions, Audit Log, the shared category editor slider, and the public category page are complete. Continue auditing remaining pages and migrating them to shared theme-aware styles.

## Sync Data

- **Sync Data page - categorised view**: Done - the admin Sync Data page now uses an integration-first hierarchy with MEX at the top level, Assets as the available data type, and Work Orders represented as a planned data type. The records view retains asset tree browsing, search, status filtering, detail inspection, sync-by-ID, and gap fill actions. Verified with Angular build on 2026-06-04.

## Audit Logs

- **Audit Logs not working**: ✅ Done — API list response now matches the Angular audit-log model, the admin page shows load failures clearly, and audit rows are written for login/logout plus page create/update/delete actions. Verified with backend and frontend builds.

## Integrations / Notifications

- **SMS integration via MessageMedia**: ✅ Done — MessageMedia SMS settings and test send added to Integrations, SMS notification rule config added to the form notification module, SMS rule configs persist in their own table, and matched SMS rules send via the MessageMedia REST API with submission rule logging. Verified with backend and frontend builds.

## Dashboard Designer Improvements

- **Per-card show/hide title**: ✅ Done — `show_title` flag on each card; designer toggle and API persist it.
- **Per-card fit-content height**: ✅ Done — `fit_content` flag; `ResizeObserver` + `grid.resizeToContent()` applies in both designer and viewer/preview after async chart loads.
- **Per-card custom CSS**: ✅ Done — `custom_css` field applied as inline style on card wrapper.
- **Per-card display mode (chart / table / both)**: ✅ Done — `display_mode` field; `'both'` shows a Chart/Table pill toggle to viewers at runtime.

## Dynamic Page Builder

- **Dynamic page builder**: ✅ Done — GrapesJS page builder added with admin pages table, settings, designer, viewer, and public `/page/:slug` rendering. Pages support external URL/iframe blocks, public vs restricted access, active status, layout vs empty-canvas rendering, MinIO-backed asset management, richer GrapesJS blocks/plugins, and seeded sample content including navbar/logo, fault-report menu/form, and embedded NTRACS page.

## Layout System

- **3 global layout variants + per-page selection**:
  - **Default** — full shell with side menu, header, login/user controls (current app shell, e.g. `/`)
  - **Minimal** — stripped shell, no side menu, no header controls (e.g. `/category/pre-start` style)
  - **Canvas** — completely empty, no chrome at all (for embedded or kiosk pages)
  - Each page/route should be able to declare which layout it uses.
  - Dashboard should be configurable to any of the 3 layouts, and users should be able to switch between them at runtime.
  - Layout selection should live in a **single centralised place** (not scattered across individual pages/routes).
  - *Status: Pending planning and implementation.*

## Terminal Support

- **Terminal table + seed data**: Add a `terminals` table with columns: `code`, `description`, `timezone`, `port_code`, `trading_name`. Seed two terminals:
  - `HPAPB` — "HPAPB, Sydney", timezone: AUS Eastern Standard Time, port_code: AUSYD, trading_name: Sydney International Container Terminals Pty Limited
  - `HPAFI` — "HPAFI, Brisbane", timezone: E. Australia Standard Time, port_code: AUBNE, trading_name: Brisbane Container Terminals Pty Limited
- **Terminal parameter on forms, pages, reports, submissions, and anywhere else required**: Records can belong to both terminals or be scoped to a specific one. Filter and display accordingly throughout the app.
- *Status: **Needs planning first — confirm plan before implementing.***

- **Implementation update**: Done - implemented in `41725c4` and pushed to `origin/main`. Added nullable `terminal_code` scope to forms, form submissions, report templates, pages, dashboards, and datasets; `null` means all terminals. API filtering includes all-terminal records plus matching terminal-specific records, report execution applies terminal filtering at SQL level, and report/dataset/dashboard compatibility checks prevent conflicting terminal scopes. Verified with `dotnet build HPA.SurveyFlow.slnx`, `dotnet test HPA.SurveyFlow.slnx --no-build`, and `npm run build` on 2026-06-05.

## Clone / Duplicate

- **Duplicate action on Pages, Forms, Reports, and Dashboards**: Done - list pages now expose Duplicate actions. Backend clone endpoints copy each entity's editable configuration with a unique "Copy of ..." name; pages and dashboards also receive unique slugs. Forms copy access rules plus notification/integration rules, reports copy RLS policies, and dashboards copy cards/layout settings. Verified with `dotnet build`, `dotnet test --no-build`, and Angular build on 2026-06-04.

**Why:** These are known gaps identified during development reviews.
**How to apply:** Use this list to prioritise implementation work and to avoid re-discovering known issues during code review or QA.
