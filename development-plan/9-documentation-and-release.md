## 9-documentation-and-release

This stage focuses on user-facing documentation, alignment with the PRD, and preparing the project for external consumption (packaging and basic release flow).

### 1. What needs to be implemented

- **Documentation structure in `docs/`**
  - Create the following documentation files (names may be refined as needed, but the structure should be clear and stable):
    - `docs/overview.md` – high-level introduction to uilint:
      - problem statement (layout linting as code),
      - snapshot architecture,
      - positioning vs Galen Framework.
    - `docs/getting-started.md` – quickstart guide:
      - installation (for library consumers),
      - minimal layout spec example,
      - running a layout check in a Playwright test.
    - `docs/galen-comparison.md` – detailed comparison with Galen Framework:
      - DSL differences (code vs `.spec` files),
      - snapshot-based vs mixed async models,
      - integration into existing E2E stacks.
    - `docs/api-core.md` – API reference for `uilint-core`:
      - core types (`ElemSnapshot`, `Elem`, `Group`, `Range`, `Violation`, `Constraint`),
      - primitive relations,
      - combinators,
      - extras,
      - layout spec and runtime types (`LayoutSpec`, `LayoutCtx`, `LayoutReport`, etc.).
    - `docs/api-playwright.md` – API reference for `uilint-playwright`:
      - `runLayoutSpec`,
      - matcher and helper functions (`toMatchLayout`, `installUilintMatchers`),
      - typical integration patterns with Playwright Test.

- **Repository-level documentation**
  - Update the root `README.md` to:
    - briefly describe uilint’s purpose.
    - link to the key documents under `docs/`.
    - show a small code example for:
      - defining a layout spec,
      - running it in a Playwright test.
  - Reference the PRD and development plan (this directory) so contributors understand the overall design.

- **Packaging and build configuration**
  - For `packages/uilint-core` and `packages/uilint-playwright`:
    - configure build tooling (e.g. `tsup`, `rollup`, or `tsc` with proper `outDir`) to emit:
      - ESM (and optionally CJS) bundles.
      - type declarations (`.d.ts`).
    - ensure `package.json` contains correct:
      - `main` / `module` / `types` entries.
      - `files`/`exports` fields that include compiled code and type definitions.
  - Add root scripts:
    - `build` – build all packages.
    - `build:core` – build `uilint-core`.
    - `build:playwright` – build `uilint-playwright`.

- **Basic release flow**
  - Define a versioning and release strategy (e.g. manual `npm publish` for now, with an eye toward automated releases later).
  - Optionally add a `CHANGELOG.md` at the root or per package.

### 2. What needs to be implemented to test quality

- **Docs correctness and examples**
  - Ensure that code snippets in documentation:
    - compile under TypeScript (e.g. by copying them into small “doctest” files or using a CI step that compiles examples).
    - run successfully where applicable (for simple examples).
  - Cross-check that all MVP features listed in the PRD are reflected somewhere in `docs/api-core.md` or `docs/api-playwright.md`.

- **Build and packaging tests**
  - Add CI steps that:
    - run `pnpm build` to ensure all packages compile.
    - run `pnpm pack` (or `npm pack` in each package directory) to ensure:
      - published tarballs contain the expected files.
      - consumers could install and use the library via a registry.

- **Link and structure checks**
  - Optionally add a script that:
    - validates internal documentation links (e.g. using a markdown link checker).
    - ensures `README.md` references the latest docs.

### 3. How to run tests to validate this stage

From the repository root:

- **Build all packages**

```bash
pnpm build
```

- **Run tests and linters (full regression)**

```bash
pnpm lint
pnpm test
```

- **Optionally, simulate a package publish**

```bash
cd packages/uilint-core
pnpm pack

cd ../uilint-playwright
pnpm pack
```

At the end of this stage:

- Documentation should give a new user enough information to:
  - understand uilint’s purpose and architecture,
  - install it,
  - write their first layout spec and Playwright test.
- The packages should be buildable and ready for publication to a package registry.


