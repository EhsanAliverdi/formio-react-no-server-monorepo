---
name: angular-user-docs
description: Generate professional end-user documentation for an Angular application, including screenshots captured from the running UI.
---

# Angular User Documentation Skill

You are documenting an Angular web application for non-technical end users.

## Goal

Generate complete user documentation by inspecting the Angular source code and interacting with the running UI through Playwright MCP.

## Documentation style

- Write for business users, not developers.
- Avoid technical implementation details unless needed.
- Use clear headings, numbered steps, screenshots, notes, warnings, and tips.
- Explain what each screen is for, what each field means, and what happens after the user clicks each action.
- Prefer practical workflows over component-by-component descriptions.
- Keep wording simple and professional.

## Required output

Create documentation under:

docs/user-guide/

Required structure:

docs/user-guide/index.md
docs/user-guide/screenshots/
docs/user-guide/features/
docs/user-guide/workflows/

## Process

1. Inspect the Angular routing structure.
2. Identify all main pages, feature modules, lazy-loaded routes, guards, and menu/navigation entries.
3. Run or confirm the Angular app is running locally.
4. Use Playwright MCP to open the app in the browser.
5. Navigate through the UI as a normal user.
6. Capture screenshots for each important screen and workflow.
7. Save screenshots in docs/user-guide/screenshots/.
8. Write user-facing documentation using Markdown.
9. Link screenshots inside the Markdown files.
10. Include a final documentation index.

## Screenshot rules

- Capture clean screenshots.
- Avoid showing secrets, tokens, local passwords, or private data.
- Prefer seeded/demo data.
- Use meaningful screenshot names, for example:
  - login-page.png
  - dashboard-overview.png
  - create-report-form.png
  - report-builder-grouping.png

## Documentation sections

For each feature, include:

1. Purpose
2. Who uses it
3. How to access it
4. Step-by-step instructions
5. Field explanations
6. Buttons and actions
7. Validation messages
8. Common mistakes
9. Related workflows
10. Screenshot references

## Quality checklist

Before finishing:

- Confirm all main routes are documented.
- Confirm screenshots exist and are linked.
- Confirm documentation is understandable by a new user.
- Confirm no developer-only details dominate the user guide.
- Confirm the documentation has a clean index.
