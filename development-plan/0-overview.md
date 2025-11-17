## 0-overview-development-plan

This document summarizes the full development plan for **uilint** and lists all numbered stages.
Each stage is described in a separate markdown file under `development-plan/` and is designed to be small, independently testable, and safe to roll out.

### 1. What needs to be implemented

- **1-repo-and-tooling-setup**
  - Define the monorepo layout (`packages/`, `examples/`, `tests/`, `docs/`).
  - Choose tooling (package manager, TypeScript, Vitest, Playwright, ESLint, Prettier) and add baseline configuration.
- **2-core-types-and-ranges**
  - Implement the core types in `uilint-core`: `ElemSnapshot`, `Elem`, `Group`, `Range`, `Violation`, `Constraint`.
  - Provide range constructors (`eq`, `gt`, `between`, etc.) and helpers to construct `Elem` from `ElemSnapshot`.
- **3-core-relations-combinators-and-extras**
  - Implement primitive relations (`below`, `inside`, `alignedHorizontally`, visibility/text checks).
  - Implement group combinators (`forAll`, `exists`, `none`, `countIs`, `amountOfVisible`, `pairwise`, `windowed`).
  - Implement MVP extras (`almostSquared`, `alignedHorizEqualGap`, `tableLayout`, `sidesHorizontallyInside`).
- **4-layout-spec-and-runtime-engine**
  - Implement the declarative DSL for layout specs: `LayoutCtx`, `ElemRef`, `GroupRef`, `LayoutSpec`, `defineLayoutSpec`.
  - Implement a pure runtime engine that evaluates a `LayoutSpec` against an in-memory snapshot store (no Playwright yet).
- **5-playwright-adapter-and-runLayoutSpec**
  - Implement `uilint-playwright` with snapshot collection from `page` and Playwright locators.
  - Implement `runLayoutSpec(page, spec, options)` and `LayoutReport` as the main async entry point.
- **6-playwright-test-helpers-and-ergonomics**
  - Implement Playwright Test helpers (matcher `toMatchLayout`, optional fixtures).
  - Provide good default reporting (e.g. JSON attachments with `LayoutReport`).
- **7-reference-frontends-and-integration-tests**
  - Implement small reference frontends in `examples/reference-frontends` (navigation/menu, grids, forms/modals, responsive layouts).
  - Add integration tests in `tests/integration` that run uilint against these frontends.
- **8-example-project-with-uilint-and-playwright**
  - Implement `examples/with-uilint` as a realistic project that uses uilint together with Playwright.
  - Demonstrate typical flows: user interactions → `runLayoutSpec` / `toMatchLayout` → report inspection.
- **9-documentation-and-release**
  - Implement user-facing documentation in `docs/` (overview, getting started, API references, Galen comparison).
  - Prepare packaging and release flow so the library can be used as an external dependency.

### 2. What needs to be implemented to test quality

- **Cross-stage testing strategy**
  - Adopt **Vitest** for unit tests in `packages/uilint-core` and `packages/uilint-playwright`.
  - Adopt **Playwright Test** for browser-level integration and example tests.
  - Define a consistent naming scheme for scripts:
    - `pnpm test` – run all tests in the monorepo.
    - `pnpm test:core` – run unit tests for `uilint-core`.
    - `pnpm test:playwright` – run adapter and matcher tests.
    - `pnpm test:integration` – run tests against reference frontends.
    - `pnpm test:example` – run tests for `examples/with-uilint`.
  - Configure CI (e.g. GitHub Actions) to run these scripts on every push and pull request.

- **Incremental quality gates**
  - Each numbered stage must introduce its own tests and `How to run tests` section.
  - A stage is considered “done” only when:
    - All tests from previous stages still pass.
    - New tests for the current stage are implemented and green.

### 3. How to run tests to validate this stage

This overview document itself does not introduce executable code; its “tests” are the tests of the individual stages.

- **For any given stage `N`**
  - Implement the code and tests described in `development-plan/N-*.md`.
  - Run the commands listed in that document’s **“How to run tests to validate this stage”** section.
- **For a full regression check after multiple stages**
  - Run at the repository root:
    - `pnpm install`
    - `pnpm lint`
    - `pnpm test`


