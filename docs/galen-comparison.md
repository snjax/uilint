## uilint vs Galen Framework

uilint is conceptually inspired by Galen Framework, but is designed for modern TypeScript + Playwright stacks. This document summarizes the main differences.

### DSL and authoring experience

- **Galen**:
  - Uses a custom textual DSL in `.spec` files.
  - Specs are parsed and interpreted by the Galen engine.
  - Layout rules live outside your application code and test code.
- **uilint**:
  - Uses plain TypeScript as the DSL.
  - Layout rules are regular functions that live next to your tests and app code.
  - You get IDE support (types, autocompletion, refactors) and can unit-test specs themselves.

### Execution model

- **Galen**:
  - Often combines browser interactions and layout checks in one flow.
  - Specs can directly trigger browser actions and rely on WebDriver semantics.
- **uilint**:
  - Enforces a clean separation:
    - Playwright code (navigation, clicks, etc.) runs in the test.
    - A single call to `runLayoutSpec(page, spec)` performs a snapshot and then runs purely synchronous constraints.
  - Constraints are deterministic, side-effect free, and easy to reason about.

### Integration into your stack

- **Galen**:
  - Traditionally centered on Selenium/WebDriver.
  - Comes with its own runners and spec tooling.
- **uilint**:
  - Built explicitly for Playwright (`@playwright/test`).
  - Exposes a matcher (`toMatchLayout`) that plugs directly into `expect`.
  - Uses Playwright locators and fixtures; no separate runner required.

### Extensibility and composition

- **Galen**:
  - Provides a rich, but fixed, set of spec primitives.
  - Extending behavior typically means customizing the engine or adding new DSL constructs.
- **uilint**:
  - Defines a small set of primitives (relations, ranges, combinators) and a composable `Constraint` abstraction.
  - Users can build their own higher-level helpers as ordinary TypeScript functions.
  - Extras like `tableLayout`, `alignedHorizEqualGap`, and `almostSquared` are implemented on top of the same primitives you use.

### Snapshot-based reasoning

uilint’s snapshot architecture makes it straightforward to debug and post-process layout issues:

- A `LayoutReport` contains:
  - spec name,
  - viewport tag/size,
  - a list of `Violation` objects with structured details (e.g. actual gaps, expected ranges).
- This lends itself well to:
  - attaching JSON reports to test runs,
  - feeding reports into AI agents for automated analysis and suggested fixes.

### When to choose uilint

uilint is a good fit if:

- You are already using Playwright for end-to-end testing.
- You prefer layout rules written in TypeScript rather than a separate DSL.
- You want snapshot-only, deterministic checks that integrate naturally into your existing CI and tooling.

If you are deeply invested in Selenium and existing Galen specs, uilint provides a migration path toward a more code-centric layout linting approach, but does not aim to be a drop-in replacement for the Galen DSL.


