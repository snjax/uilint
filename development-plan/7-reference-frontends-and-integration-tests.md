## 7-reference-frontends-and-integration-tests

This stage introduces small reference frontends and integration tests that use **uilint** against real UI layouts.

### 1. What needs to be implemented

- **Reference frontends directory structure**
  - Under `examples/reference-frontends/`, create subprojects for key layout patterns:
    - `navigation-menu/` – responsive top navigation/menu.
    - `cards-grid/` – card/grid or table layout with equal gaps.
    - `forms-and-modals/` – forms with validation states and modal dialogs.
    - `responsive-layout/` – layout that changes between mobile/tablet/desktop breakpoints.
  - Each subproject should be:
    - self-contained (own `package.json` if needed, or a shared config with workspace scripts),
    - simple to build and run (e.g. Vite + React or a minimal SPA).

- **Frontend implementation guidelines**
  - Keep UI minimal but realistic:
    - semantic HTML where practical (headers, nav, main, footer).
    - stable selectors (`id`s or `data-testid` attributes) for layout specs.
  - Ensure layouts are deterministic and do not depend on external APIs or unstable data sources.

- **Layout specs for reference frontends**
  - For each subproject, implement layout specs using `uilint-core` (e.g. under `examples/reference-frontends/<name>/uilint/specs/`):
    - `navigation-menu`:
      - header inside viewport top with zero horizontal margins.
      - menu below header.
      - menu items horizontally aligned with equal gaps.
    - `cards-grid`:
      - cards arranged in rows/columns using `tableLayout`.
      - card images `almostSquared`.
    - `forms-and-modals`:
      - modal centered within viewport.
      - form fields aligned vertically with consistent gaps.
    - `responsive-layout`:
      - verify different `LayoutSpec` variants or conditional constraints per viewport tag.

- **Integration tests in `tests/integration`**
  - Under `tests/integration/`, add suites that:
    - start the appropriate reference frontend (via Playwright `webServer` config or explicit start script).
    - navigate to the relevant page (e.g. `/menu`, `/cards`, `/form`, `/responsive`).
    - execute interactions when needed (open menus, open modals, scroll).
    - call `runLayoutSpec` or use `toMatchLayout` for the corresponding spec(s).
  - Organize tests per frontend:
    - `reference-frontends.navigation-menu.spec.ts`
    - `reference-frontends.cards-grid.spec.ts`
    - etc.

### 2. What needs to be implemented to test quality

- **Happy-path integration tests**
  - For each reference frontend, add tests that:
    - verify the “ideal” layout at one or more viewport sizes (e.g. mobile/desktop).
    - assert that there are **no** violations for the expected layout.

- **Negative tests (optional but recommended)**
  - For at least one frontend (e.g. `cards-grid`), add a test that:
    - intentionally introduces a layout bug (via query parameter, alternate route, or a test-only flag).
    - expects `runLayoutSpec` / `toMatchLayout` to report violations.
  - Use these tests to validate that violation messages are understandable and useful.

- **Stability and flakiness checks**
  - Run integration tests multiple times locally to ensure they are stable (no random failures due to timing).
  - Use Playwright features like:
    - `page.waitForLoadState('networkidle')`
    - explicit waits for animations to settle, if present.

### 3. How to run tests to validate this stage

From the repository root:

- **Run only integration tests against reference frontends**

```bash
pnpm test:integration
```

- **Or run the entire test suite**

```bash
pnpm test
```

Depending on how the frontends are integrated, Playwright’s `webServer` configuration may automatically start the appropriate dev server(s), or you may need to run a shared dev server script such as:

```bash
pnpm dev:reference-frontends
```

At the end of this stage:

- Reference frontends should be runnable locally.
- Integration tests should verify that uilint’s constraints work against real UIs and remain stable across multiple runs.


