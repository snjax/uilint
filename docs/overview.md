## uilint overview

uilint is a layout linter for Playwright. It lets you describe visual and spatial invariants of your UI using TypeScript code, then assert them inside your existing Playwright tests.

### Problem statement

Traditional end-to-end tests are very good at asserting behavior (clicks, navigation, data), but they are weak at expressing layout rules:

- Ensuring a header sticks to the top of the viewport.
- Making sure cards have equal gaps and aligned baselines.
- Verifying that a modal is centered and its form fields are aligned.

Most projects rely on manual visual QA or brittle screenshot diffing. uilint aims to bring **layout linting as code** into your existing test suite.

### Core idea: snapshot architecture

uilint separates two concerns:

- **Async snapshot collection** – a single call to `runLayoutSpec(page, spec)`:
  - inspects the spec to discover which elements/groups are needed,
  - queries the browser via Playwright and captures geometry, visibility, and text into `ElemSnapshot` objects,
  - constructs a synchronous runtime model (`Elem`, `Group`) on top of these snapshots.
- **Sync constraint evaluation** – all layout logic is expressed as pure, synchronous functions that:
  - accept runtime elements and numeric ranges,
  - return `Violation[]` describing what went wrong.

This makes constraints easy to test and reason about, and keeps Playwright interactions localized to one call site.

### Key concepts

- **ElemSnapshot** – a plain object with bounding box, visibility, presence, text, and optional metadata for each DOM node.
- **Elem** – a runtime wrapper around a snapshot with convenient getters (`width`, `height`, `centerX`, etc.).
- **Group** – an array of `Elem` instances; used for collections like menus, cards, or table rows.
- **Range** – a function `number -> boolean` that expresses numeric conditions (`between(8, 16)`, `approx(1, 0.1)`).
- **Constraint** – a unit of layout logic with a `name` and a synchronous `check(): Violation[]` method.
- **LayoutSpec** – declarative description of:
  - which elements/groups participate in a layout,
  - which constraints must hold between them.
- **LayoutReport** – structured result of executing a spec against a page, containing all violations and basic viewport metadata.

### High-level workflow

1. Write a spec using `defineLayoutSpec` from `@uilint/core`.
2. In a Playwright test, call `runLayoutSpec(page, spec, { viewportTag })` or use the matcher `expect(page).toMatchLayout(spec, options)`.
3. If there are violations, the test fails and a structured `LayoutReport` can be attached to the test output.

### Positioning vs Galen Framework

uilint borrows ideas from Galen Framework (spec-based layout checks) but differs in several key ways:

- **DSL as code** – specs are written in TypeScript, not in a separate `.spec` DSL.
- **Snapshot-only DSL** – constraints never talk to the browser; they operate on prepared snapshots.
- **Playwright-native** – uses `page.locator` and integrates directly into Playwright Test.
- **Compositional primitives** – small set of core relations and combinators, instead of a large fixed spec vocabulary.


