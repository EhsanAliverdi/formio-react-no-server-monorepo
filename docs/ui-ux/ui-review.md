# UI/UX Review — SurveyFlow Admin

**Date:** 2026-05-29  
**Reviewer:** Claude (ui-ux-designer skill)  
**Stack:** Angular + Tailwind CSS + TailAdmin template  
**Pages reviewed:** Login, Public Dashboard, Admin Overview, Forms, Submissions, Reports, Users, Integrations, Settings, Audit Log, API Keys, Datasets

---

## Overall Design Assessment

SurveyFlow is a clean, professional enterprise form management application built on the TailAdmin template with Tailwind CSS. The overall design language is consistent and the colour palette (brand blue/purple, gray backgrounds, green/amber/red status colours) is well-chosen for an enterprise context.

**Strengths:**
- Consistent card styling, spacing, and typography throughout
- Good use of colour-coded status badges (public, active, errors, warnings)
- Dark mode support is present
- The sidebar navigation is clear and well-labelled with icons
- Responsive layout foundation is solid

**Areas needing improvement:**
- The sidebar collapses by default — users land with no navigation visible
- Several pages have large empty-state areas with minimal guidance
- The submissions table rows are very tall due to multiline form names
- Header is incomplete — hamburger only, no breadcrumb or page context
- Inconsistent action button styles across pages (outlined vs filled vs text-link)

---

## Page-by-Page Findings

### 1. Login Page
![Login](screenshots/01-landing.png)

**What works:**
- Clean, centered card layout
- Good whitespace
- Password visibility toggle is present
- Footer copyright is unobtrusive

**Issues:**
- The subtitle "Welcome back! Please enter your details." has "back!" rendered in a blue link colour — looks like a broken hyperlink, not intentional emphasis
- No "Forgot password?" link visible
- Page title in browser tab is "AngularFrontend" — should be "SurveyFlow"

---

### 2. Public Dashboard (User Home)
![Public Dashboard](screenshots/02-dashboard.png)

**What works:**
- Stat cards with clear numbers (27 submissions, 10 forms)
- Recent forms as actionable cards with "Fill Form" CTA

**Issues:**
- The sidebar is completely hidden by default — users get a hamburger-only header with no navigation hint
- "Fill Form" button is very large and dominant for a secondary action inside a card
- The two stat cards use different accent colours (purple vs green) with no legend
- "Recent Forms" grid: the 3rd card is orphaned in a left-aligned half-row, looking unfinished
- No empty state if a user has zero submissions

---

### 3. Admin Overview (Dashboard)
![Admin Dashboard with Sidebar](screenshots/03-admin-overview-sidebar.png)

**What works:**
- Five stat cards are clearly labelled
- "My Reports" recently-used section adds practical value
- Sidebar navigation is comprehensive and well-structured with icons

**Issues:**
- Stat cards have no icons or trend indicators — just a bare number, hard to scan at a glance
- "LAST 7 DAYS: 27" and "TOTAL SUBMISSIONS: 27" show the same number — confusing without trend context
- The 5th card (Last 7 Days) sits alone in a full-width 3rd row — breaks the 2-column grid
- "My Reports" items are truncated with "..." — no hover tooltip to reveal the full name
- The sidebar opens as an overlay and grays out the content (mobile drawer behaviour on desktop)

---

### 4. Forms List
![Forms](screenshots/04-admin-forms.png)

**What works:**
- Table is clean and appropriately dense
- "Public" badge is clear
- Search bar is well-placed
- "Import JSON" and "+ New Form" actions are clearly separated

**Issues:**
- **Delete button is same visual weight as View/Edit/Export** — high risk of accidental clicks
- "Sub-forms (1)" link is in a light muted blue — looks disabled, not clickable
- "ANONYMOUS" column shows "Yes/No" text — a tick/cross icon would scan faster
- No pagination visible — unclear if the list is truncated
- No sort controls on any column
- All form thumbnail icons are generic document icons — no visual differentiation

---

### 5. Submissions List
![Submissions](screenshots/05-admin-submissions.png)

**What works:**
- Warning/Error badges (amber/red) are immediately visible and meaningful
- Integration status ("✓ Sent #224717", "✗ Failed") is informative
- Date and form filters are present

**Issues:**
- **Row height is excessive** — form names wrap to 3–4 lines, making the table feel like a list
- The `+` expand button is tiny with no label — not obvious it expands sub-form data
- Date inputs use browser-native styling, inconsistent with the app's design system
- "14 submission(s)" is awkwardly worded — use "14 submissions"
- Search box appears clipped at the right edge — looks like an incomplete UI
- View and Delete buttons are stacked vertically inside a cell — unusual pattern

---

### 6. Reports
![Reports](screenshots/06-admin-reports.png)

**What works:**
- Report cards are well-structured: tags, description, column count, date
- "Recently Used" quick-access chips are an excellent UX pattern
- Favourite star is present

**Issues:**
- Card titles truncate mid-word ("Quay Crane Pre-Start — Faults by...") with no hover tooltip
- The "Select a form..." dropdown next to "+ New Report" implies a form must be selected first — workflow intent is unclear to new users
- Filter row (All forms / All categories / Search / Outdated only / Favourites / 20 results) is cramped
- Run (filled blue), Edit (outlined), Delete (icon-only trash) — three different button patterns on one card

---

### 7. Users
![Users](screenshots/07-admin-users.png)

**What works:**
- Simple, readable table
- Role and status badges are colour-coded
- "+ Add User" CTA is prominently placed

**Issues:**
- **No search or filter** — will become unusable at scale
- "viewer", "supervisor", and "operator" role badges are all the same gray — indistinguishable by colour
- Edit and Delete buttons are the same visual weight — Delete should be de-emphasised
- No secondary columns (last login, created date)
- No sort controls

---

### 8. Integrations
![Integrations](screenshots/08-admin-integrations.png)

**What works:**
- Tab navigation (Email / MEX Maintenance) is clean
- Enable/disable toggle is well-placed and clearly labelled
- SMTP/SendGrid segmented button switcher is clear

**Issues:**
- The "Save" button is at the top-right — it disappears from view as the user fills in lower fields
- Password helper text "(set — enter new to change)" is styled green, which conflicts with success/valid state semantics — should be gray
- No inline save feedback — relies on toast only

---

### 9. Site Settings
![Settings](screenshots/09-admin-settings.png)

**What works:**
- Logo preview is shown inline — very helpful
- Section grouping (Site name, Logos & Favicon) is clear

**Issues:**
- "Save" button at top-right disappears below the fold when editing lower sections — needs to be sticky
- Raw API file path (`/api/uploads/images/...`) is shown in a plain input — should be read-only with a separate "Change" button
- "Upload image" button is unstyled compared to the rest of the design system

---

### 10. Audit Log
![Audit Log](screenshots/10-admin-audit-log.png)

**What works:**
- Filter controls (entity type, search, date range) are clearly laid out

**Issues:**
- "No audit records found." has no icon and no guidance (e.g. "Adjust the date range or entity filter")
- Date inputs use browser-native pickers — inconsistent with app design
- "Export CSV" is a plain text link — easy to miss

---

### 11. API Keys
![API Keys](screenshots/11-admin-api-keys.png)

**What works:**
- Clean, uncluttered layout

**Issues:**
- "No API keys yet." empty state has no icon, no description of what API keys are for, and no prompt
- "+ New Key" is styled as a text link — inconsistent with other primary actions that use filled buttons
- No documentation link or contextual help

---

### 12. Datasets
![Datasets](screenshots/12-admin-datasets.png)

**What works:**
- Card grid is well-structured: title, source form, description, date, and status badge
- Descriptions are informative and readable

**Issues:**
- Delete is an icon-only trash can with no confirmation label — high accidental deletion risk
- "Edit" is a full-width outlined button taking the entire card bottom — visually heavy for a secondary action
- No search or filter
- No sort order control

---

## Visual Hierarchy Issues

| Issue | Location | Severity |
|---|---|---|
| Sidebar hidden by default — no nav visible on load | All admin pages | High |
| Delete buttons same weight as primary actions | Forms, Users, Submissions, Datasets | High |
| Stat cards have no icons or trend indicators | Admin Overview | Medium |
| Orphaned single cards in grids | Dashboard, Public Home | Medium |
| Truncated text without tooltip | Reports, My Reports | Medium |
| Browser tab title shows "AngularFrontend" | All pages | Low |

---

## Accessibility Concerns

- Icon-only trash buttons on Datasets and Reports have no visible label or `aria-label`
- The "back!" text in the login subtitle renders in blue — may be read as a hyperlink by screen readers
- Date inputs rely on browser-native pickers which have variable accessibility across browsers
- Role badges on Users use colour alone to differentiate some roles (all gray for viewer/supervisor/operator)

---

## Quick Wins

1. **Add `title` tooltip to all truncated text** — zero visual change, instant fix
2. **De-emphasise Delete buttons** — change to `text-red-600` link style or move into a `⋯` actions menu
3. **Fix browser tab title** — change `<title>AngularFrontend</title>` to `SurveyFlow`
4. **Add `aria-label` to icon-only trash buttons** — 5-minute accessibility fix
5. **Fix "14 submission(s)"** — use "14 submissions"
6. **Change Password helper text colour** from green to gray (Integrations page)
7. **Truncate submission form names to one line** with `overflow-hidden text-ellipsis whitespace-nowrap` — halves table row height

---

## High-Impact Redesign Recommendations

### 1. Persistent sidebar on desktop
The sidebar should default to expanded on desktop (≥1024px). For a data-heavy admin tool, every page load should show the full navigation without requiring a click. The current behaviour (collapsed to icon-only) is a mobile pattern applied inappropriately to desktop.

### 2. Stat cards with icons and trend indicators
Add a small icon per stat and a secondary line showing the trend or context (e.g. "↑ 3 vs last week"). This transforms the dashboard from a count display into an actionable overview.

### 3. Fix submissions table row height
Form names should be truncated to one line with `title` tooltip. This alone reduces the table's visual noise significantly and lets users see ~3× as many rows.

### 4. Standardise action button patterns
Define one consistent pattern across all pages:
- **Primary action** (Run, View, Fill Form): `ta-btn ta-btn-primary`
- **Secondary action** (Edit, Export): `ta-btn ta-btn-secondary`
- **Destructive action** (Delete): `text-sm text-red-600 hover:underline` or inside a `⋯` dropdown

### 5. Replace browser-native date pickers
The native `<input type="date">` renders differently per browser. Replace with a consistent Angular date range component across Submissions and Audit Log.

### 6. Improve empty states
API Keys, Audit Log (no results), and any zero-data states should follow a pattern:
- Small contextual icon
- One sentence of context
- CTA button to take the first action

### 7. Sticky Save button on long forms
Integrations and Settings need a sticky footer bar (or sticky top action bar) that remains visible when the user scrolls. The current top-right Save button disappears mid-form.
