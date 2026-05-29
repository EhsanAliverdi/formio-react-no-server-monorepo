# Playwright MCP Setup

To allow Claude Code to inspect the Angular UI and capture screenshots, install Playwright MCP:

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

Then run the Angular app:

```bash
npm start
```

or:

```bash
ng serve
```

Default application URL used by commands:

```
http://localhost:4200
```

## Useful Claude Code commands after setup

```
/generate-user-docs
/qa-test-app
/qa-write-tests
/qa-regression
/ui-review
/ui-redesign-page <page or component>
/ui-create-design-system
```
