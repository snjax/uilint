## 5-playwright-adapter-and-runLayoutSpec

This stage implements the Playwright adapter package **uilint-playwright**, responsible for collecting snapshots from a real browser and delegating evaluation to the core runtime.

### 1. What needs to be implemented

- **Playwright adapter package scaffold**
  - In `packages/uilint-playwright`:
    - Ensure `package.json` defines:
      - `name`, `version`, `main`/`module` fields.
      - dependency on `@playwright/test` (or `playwright` if using the core client).
      - dependency on `uilint-core`.
    - Add `tsconfig.json` extending `tsconfig.base.json`.
    - Add a minimal `src/index.ts` file.

- **Snapshot collection from Playwright**
  - Implement a snapshot collection module (e.g. `src/snapshots.ts`) that:
    - accepts a Playwright `Page` and a `LayoutSpec`.
    - inspects the spec’s internal representation to discover all required selectors and groups.
    - for each selector:
      - creates appropriate locators (CSS or XPath) using `page.locator(...)`.
      - retrieves bounding boxes, visibility/presence, and text:
        - `locator.boundingBox()`
        - `locator.isVisible()`
        - `locator.count()` and iteration over elements as needed.
        - `locator.nth(i).innerText()` or `textContent()`.
      - builds an `ElemSnapshot` for each relevant DOM element.
    - returns an in-memory snapshot store compatible with the core runtime from Stage 4.
  - Consider performance:
    - batch locator calls when possible.
    - limit extra work to what is needed for the spec.

- **Public `runLayoutSpec` implementation**
  - Implement in `packages/uilint-playwright/src`:
    - `async function runLayoutSpec(page: Page, spec: LayoutSpec, options?: LayoutRunOptions): Promise<LayoutReport>;`
  - Responsibilities:
    - read the current view size from Playwright (`page.viewportSize()` or equivalent).
    - call the snapshot collector to build the snapshot store.
    - call the core runtime (`evaluateLayoutSpecOnSnapshots` or equivalent) to obtain a `LayoutReport`.
    - enrich the report with:
      - `scenarioName` / `snapshotName` (from options, defaulting to `'unknown'`)
      - `viewTag` (from `options`)
      - `viewSize`
    - return the final `LayoutReport`.

- **Error handling and timeouts**
  - Ensure `runLayoutSpec`:
    - respects Playwright’s timeouts (or accepts a custom timeout option if needed).
    - handles missing elements gracefully:
      - mark elements as `present: false` or `visible: false` when appropriate,
      - avoid throwing when an expected element is absent unless configuration demands it.
    - produces clear errors when snapshot collection itself fails (e.g. locator errors).

- **Public exports**
  - Export from `packages/uilint-playwright/src/index.ts`:
    - `runLayoutSpec`
    - `LayoutSpec`, `LayoutRunOptions`, `LayoutReport` re-exported from `uilint-core` for convenience.

### 2. What needs to be implemented to test quality

- **Integration tests with Playwright and a minimal HTML page**
  - Under `tests/integration/playwright-adapter/`, add tests that:
    - spin up a minimal page (using Playwright’s built-in `page.setContent` or a static HTML file).
    - define a simple layout spec in code (using `defineLayoutSpec` and primitives from `uilint-core`).
    - call `runLayoutSpec(page, spec, { viewTag: 'test' })`.
    - verify that:
      - no errors are thrown.
      - `LayoutReport.scenarioName` / `LayoutReport.snapshotName` are correct.
      - `LayoutReport.viewSize` matches the configured view frame.
      - `LayoutReport.violations` is either empty (for a passing layout) or contains the expected violations.

- **Tests for missing elements and error handling**
  - Add cases where:
    - the spec references selectors that are absent on the page.
    - elements are present but invisible.
  - Verify that:
    - snapshots reflect `present`/`visible` flags correctly.
    - resulting `LayoutReport.violations` express these conditions clearly through `visible`/`present` constraints.

- **Performance and robustness checks (lightweight)**
  - Add a test that:
    - uses a page with multiple elements for a group.
    - verifies that snapshot collection handles multiple instances and indexing correctly.

### 3. How to run tests to validate this stage

From the repository root:

- **Install Playwright browsers (once)**

```bash
pnpm exec playwright install
```

- **Run adapter-specific tests**

```bash
pnpm test:playwright
```

- **Or run the full suite**

```bash
pnpm test
```

At the end of this stage:

- `runLayoutSpec(page, spec, options)` should work end-to-end on a minimal Playwright page.
- All core tests (from Stages 2–4) and the new adapter tests must pass.


