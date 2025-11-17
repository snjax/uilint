## Project structure

Top-level layout of the repository is aligned with the PRD and consists of four main blocks:

- **`packages/` – testing library**
  - **`packages/uilint-core/`**: core layout‑linting engine.
    - `src/` – TypeScript sources for:
      - core types (`ElemSnapshot`, `Elem`, `Group`, `Range`, `Violation`, `Constraint`);
      - primitive relations (`below`, `inside`, `alignedHorizontally`, `visible`, `textMatches`, etc.);
      - combinators (`forAll`, `exists`, `none`, `countIs`, `pairwise`, `windowed`);
      - extras (`almostSquared`, `alignedHorizEqualGap`, `tableLayout`, `sidesHorizontallyInside`, etc.).
    - `index.ts` – public exports of the core DSL.
  - **`packages/uilint-playwright/`**: Playwright integration layer.
    - `src/` – implementation of:
      - snapshot collection (`ElemSnapshot` creation via `page.locator`, `boundingBox`, `isVisible`, `textContent`);
      - `runLayoutSpec(page, spec, options)` runtime;
      - Playwright Test helpers (matcher `toMatchLayout`, fixtures if needed).
    - `index.ts` – public Playwright‑facing API.

- **`examples/` – reference frontends and example project**
  - **`examples/reference-frontends/`** – small demo frontends used as targets for layout‑linting tests.
    - `navigation-menu/` – responsive navigation/menu layout.
    - `cards-grid/` – cards grid/table layout with equal gaps.
    - `forms-and-modals/` – forms, dialogs and modal windows.
    - (each subproject contains its own minimal frontend code and build/dev configuration).
  - **`examples/uilint-crm-demo/`** – real‑world example project that uses uilint together with Playwright.
    - `frontend/` – application under test.
    - `playwright/` – Playwright configuration and tests:
      - layout specs built with `uilint-core`;
      - tests calling `runLayoutSpec` / `toMatchLayout` against the example app.

- **`tests/` – automated tests of the library on reference frontends**
  - **`tests/unit/`** – unit tests for the core library:
    - tests for ranges, primitive relations and combinators in `uilint-core`;
    - tests for extras (`tableLayout`, `sidesHorizontallyInside`, etc.).
  - **`tests/integration/`** – integration tests running against `examples/reference-frontends`:
    - Playwright‑based tests that:
      - build/run reference frontends;
      - execute `runLayoutSpec` with predefined specs;
      - assert on `LayoutReport` and its `violations`.

- **`docs/` – documentation**
  - High‑level and API documentation for the core library and Playwright adapter:
    - `docs/overview.md` – conceptual overview and motivation.
    - `docs/getting-started.md` – installation, basic usage, first layout spec.
    - `docs/galen-comparison.md` – detailed comparison with Galen Framework.
    - `docs/api-core.md` – documentation for `uilint-core` primitives, combinators and extras.
    - `docs/api-playwright.md` – documentation for `runLayoutSpec`, matchers and Playwright integration patterns.
  - All new core features must be reflected here.

Additionally, the repository root will contain common tooling/configuration files (package manager workspace config, `tsconfig`, Playwright config, CI settings) shared across `packages/`, `examples/` and `tests/`.
