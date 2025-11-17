## 8-example-project-with-uilint-and-playwright

This stage implements a realistic example project that uses **uilint** together with Playwright, demonstrating how users can adopt the library in their own repositories.

### 1. What needs to be implemented

- **Example project structure**
  - Under `examples/with-uilint/`, create:
    - `frontend/` – a small but realistic web application (e.g. login page, dashboard with cards, filters, and a modal).
    - `playwright/` – Playwright configuration and tests that target the example app.
  - The frontend can reuse patterns from the reference frontends but in a single coherent application.

- **Frontend application**
  - Implement a minimal UI with:
    - a header and navigation area,
    - a main content area with cards or a table,
    - at least one form (e.g. login or search/filter),
    - a modal or panel that can be opened via user interaction.
  - Ensure the UI:
    - uses stable selectors suitable for layout specs (`id`, `data-testid`),
    - has deterministic content suitable for tests.

- **Layout specs for the example project**
  - Under `examples/with-uilint/uilint/specs/`, define layout specs for key screens:
    - `loginLayout` – similar to the PRD example:
      - header and footer pinned to top/bottom of viewport,
      - menu below header,
      - content below menu,
      - menu items aligned horizontally.
    - `dashboardLayout` – uses extras:
      - cards arranged with `tableLayout` and `alignedHorizEqualGap`.
      - icon or thumbnail areas that are `almostSquared`.
  - Ensure specs are written using the actual `uilint-core` API (`defineLayoutSpec`, primitives, combinators, extras).

- **Playwright tests for the example project**
  - In `examples/with-uilint/playwright/`:
    - configure `playwright.config.ts` (may extend the root config).
    - add tests that:
      - navigate through realistic flows:
        - open login page, perform login or a mock login action.
        - navigate to dashboard, apply filters, open modals.
      - call `runLayoutSpec` or use `toMatchLayout` after these interactions to verify that layout invariants hold.
    - include tests across multiple viewports (mobile and desktop).

### 2. What needs to be implemented to test quality

- **End-to-end layout tests**
  - Add tests that:
    - assert zero violations for the “happy path” flows and supported viewports.
    - optionally assert specific violations in intentionally broken scenarios (e.g. toggling a debug flag that misaligns elements).

- **Usage documentation inside the example**
  - Add a short `README.md` in `examples/with-uilint/` explaining:
    - how the example is structured,
    - how it uses uilint (`uilint-core` and `uilint-playwright`),
    - where layout specs live and how they relate to tests.
  - This doubles as an informal test that the example is comprehensible to new users.

- **Config sanity**
  - Ensure the example project:
    - builds without errors,
    - imports uilint packages correctly (using workspace references rather than published versions during development).

### 3. How to run tests to validate this stage

From the repository root:

- **Run tests for the example project only**

```bash
pnpm test:example
```

- **Or, from within the example project directory (if scripts are local)**

```bash
cd examples/with-uilint
pnpm install   # if the example has its own package.json
pnpm test      # or `pnpm playwright test` depending on setup
```

- **Run the example app manually (for manual verification)**

```bash
cd examples/with-uilint
pnpm dev
```

At the end of this stage:

- The example project should serve as a reference for how to integrate uilint into a typical Playwright-based E2E setup.
- All example tests must pass alongside the rest of the monorepo tests.


