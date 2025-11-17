## 6-playwright-test-helpers-and-ergonomics

This stage improves developer experience by providing Playwright Test helpers and matchers built on top of `runLayoutSpec`.

### 1. What needs to be implemented

- **Custom matcher `toMatchLayout`**
  - Implement a matcher in `packages/uilint-playwright` (e.g. `src/matchers.ts`) that can be added via `expect.extend`:
    - Signature (conceptual):
      - `async toMatchLayout(page: Page, spec: LayoutSpec, options?: LayoutRunOptions)`
    - Behavior:
      - calls `runLayoutSpec(page, spec, options)`.
      - considers the assertion **passing** when `report.violations.length === 0`.
      - on failure:
        - prints the number of violations,
        - optionally pretty-prints a subset of violation details or points to attached JSON.
  - Expose a helper function to install the matcher, e.g.:
    - `export function installUilintMatchers(): void { expect.extend({ toMatchLayout }); }`

- **Optional fixtures / helpers for Playwright Test**
  - Add helpers to streamline typical usage patterns, for example:
    - a function `withLayoutLint(test, spec, options)` that wraps Playwright tests.
    - or a fixture that provides a preconfigured `expectLayout` function.
  - Keep this part minimal for MVP, but design the API to be easily extendable later.

- **Default reporting and attachments**
  - Define a convention for attaching `LayoutReport` to Playwright Test output:
    - When the matcher fails, attach JSON with the full `LayoutReport` via `testInfo.attach(...)`.
    - Optionally, include a text summary in the failure message with:
      - spec name,
      - viewport tag/size,
      - a few top violations.
  - Ensure the matcher’s `message()` function is concise yet informative.

- **Public exports**
  - Update `packages/uilint-playwright/src/index.ts` to export:
    - `runLayoutSpec`
    - matcher-related helpers (e.g. `installUilintMatchers`, `toMatchLayout` type definition).

### 2. What needs to be implemented to test quality

- **Matcher behavior tests**
  - Add tests under `tests/integration/playwright-matchers/` that:
    - configure `expect.extend({ toMatchLayout })` for Playwright Test.
    - run simple specs against a small HTML page.
    - verify:
      - the matcher passes when there are no violations.
      - the matcher fails when there are violations, and:
        - `expect` throws a proper assertion error.
        - error messages mention the number of violations.

- **Attachment tests**
  - Add tests that:
    - intentionally create layouts with known violations.
    - confirm that, on failure, a JSON attachment with the `LayoutReport` is produced (via `testInfo.attach`), at least at the level of “attachment exists” (exact content can be validated loosely).

- **Type-level tests**
  - Optionally add type tests ensuring:
    - the extended `expect(page).toMatchLayout(...)` is correctly typed.
    - the matcher rejects invalid argument combinations at compile time.

- **Regression checks**
  - Ensure introducing matchers does not change the behavior of `runLayoutSpec` or break earlier stages’ tests.

### 3. How to run tests to validate this stage

From the repository root:

- **Run Playwright-related tests (adapter + matchers)**

```bash
pnpm test:playwright
```

- **Or run the entire test suite**

```bash
pnpm test
```

At the end of this stage:

- Developers should be able to write tests like:

```ts
await expect(page).toMatchLayout(loginLayoutSpec, { viewportTag: 'desktop' });
```

- All new matcher tests and previously added adapter/core tests must pass.


