## 1-repo-and-tooling-setup

This stage establishes the monorepo structure and baseline tooling for **uilint** so that later stages can focus purely on domain logic.

### 1. What needs to be implemented

- **Monorepo layout**
  - Create the following top-level directories (matching the PRD and `STRUCTURE.md`):
    - `packages/uilint-core/`
    - `packages/uilint-playwright/`
    - `examples/reference-frontends/`
    - `examples/uilint-crm-demo/`
    - `tests/`
    - `docs/`
  - Add minimal `package.json` files for:
    - root workspace
    - `packages/uilint-core`
    - `packages/uilint-playwright`

- **Package manager and scripts**
  - Choose **pnpm** (recommended for multi-package repositories) and configure workspaces in the root `package.json`.
  - Add root scripts:
    - `lint` – run ESLint across all packages.
    - `test` – run all tests (unit and integration) in the monorepo.
    - `test:core` – run unit tests only for `uilint-core`.
    - `test:playwright` – run tests for `uilint-playwright` and Playwright-based helpers.
    - `test:integration` – run tests under `tests/integration`.
    - `test:example` – run tests for `examples/uilint-crm-demo`.

- **TypeScript configuration**
  - Add a shared `tsconfig.base.json` at the repo root with:
    - `strict: true`
    - ES modules target and JSX settings appropriate for the chosen frontend stack.
  - Add `tsconfig.json` in:
    - `packages/uilint-core`
    - `packages/uilint-playwright`
    - test and example projects as needed (extending from `tsconfig.base.json`).

- **Testing and linting tooling**
  - Add dev dependencies:
    - `typescript`
    - `vitest` (and `@vitest/coverage-*` as needed)
    - `@playwright/test`
    - `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`
    - `prettier` (optional but recommended)
  - Create basic configuration:
    - `vitest.config.ts` for library tests.
    - `playwright.config.ts` for Playwright tests.
    - `.eslintrc.cjs` and `.prettierrc` at the root.

- **Continuous integration scaffold**
  - Add a CI configuration (e.g. `.github/workflows/ci.yml`) that runs on pushes and pull requests:
    - `pnpm install`
    - `pnpm lint`
    - `pnpm test`

### 2. What needs to be implemented to test quality

- **Smoke unit tests**
  - In `packages/uilint-core`, add a trivial test file (e.g. `core.smoke.test.ts`) that:
    - imports a dummy function or constant,
    - verifies that Vitest is wired correctly.
  - In `packages/uilint-playwright`, add a trivial test file that can run without a browser (e.g. checking that the package exports a placeholder function).

- **Linting validation**
  - Add a small sample TypeScript file in each package and ensure:
    - ESLint can run on it,
    - the configured rules do not produce unexpected errors.

- **Playwright sanity check**
  - Create a minimal Playwright test (e.g. `tests/playwright-smoke.spec.ts`) that:
    - opens `about:blank` or a tiny static HTML page,
    - asserts on `page.title()` or a simple DOM operation.
  - This ensures infrastructure is ready before uilint-specific logic appears.

### 3. How to run tests to validate this stage

From the repository root:

- **Install dependencies**

```bash
pnpm install
```

- **Run linters**

```bash
pnpm lint
```

- **Run all tests (should execute only smoke tests at this stage)**

```bash
pnpm test
```

- **Optionally, run specific subsets**

```bash
pnpm test:core
pnpm test:playwright
```

All of these commands should succeed with only the smoke tests and placeholder code in place.


