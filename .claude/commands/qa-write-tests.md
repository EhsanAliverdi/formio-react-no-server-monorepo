Use the professional-qa-tester skill.

Generate automated Playwright end-to-end tests for this Angular application.

First inspect:

- package.json
- Angular routes
- main layouts
- feature modules
- important forms
- existing test setup

Then:

1. Check whether Playwright is already installed.
2. If not installed, add Playwright in the standard way for this project.
3. Create E2E tests for the main workflows.
4. Add happy path tests.
5. Add validation/error tests.
6. Add navigation tests.
7. Add smoke tests for all main routes.
8. Use stable locators.
9. If needed, add data-testid attributes to the Angular templates.
10. Run the tests.
11. Fix failing tests if the failure is caused by test code.
12. Document any real application bugs separately.

Use this structure where suitable:

tests/e2e/
  smoke.spec.ts
  navigation.spec.ts
  forms.spec.ts
  workflows/

At the end, report:

- Test files created
- Test cases added
- Commands run
- Passing/failing results
- Any app bugs discovered
