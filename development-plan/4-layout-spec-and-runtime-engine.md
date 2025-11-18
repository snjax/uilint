## 4-layout-spec-and-runtime-engine

This stage introduces the declarative layout specification DSL and a pure runtime engine that works over snapshots, independent of Playwright.

### 1. What needs to be implemented

- **Specification model (`LayoutSpec`)**
  - Implement, in `packages/uilint-core`, the following public types:
    - `type SpecBuilder = (ctx: LayoutCtx) => void;`
    - `interface LayoutSpec { name: string; /* internal representation fields */ }`
  - Design an internal representation for:
    - element and group references used in the spec,
    - registered constraint factories that will be invoked at runtime.

- **Build-time context (`LayoutCtx`)**
  - Implement `LayoutCtx` with methods:
    - `el(selector: string | { type: 'css' | 'xpath'; selector: string }): ElemRef;`
    - `group(selector: string | { type: 'css' | 'xpath'; selector: string }): GroupRef;`
    - special elements: `viewport: ElemRef`, `screen: ElemRef`;
    - constraint registration, e.g.:
      - `must(...constraints: Constraint[] | Constraint[][]): void;`
      - and/or a helper `mustRef` that accepts a runtime factory `(rt: RuntimeCtx) => Constraint | Constraint[]`.
  - Implement simple `ElemRef` and `GroupRef` types that encapsulate internal keys:
    - `interface ElemRef { key: string }`
    - `interface GroupRef { key: string }`

- **Runtime context for evaluation**
  - Define an internal `RuntimeCtx` that:
    - maps `ElemRef` and `GroupRef` to actual `Elem` and `Group` instances using snapshot data.
    - exposes helpers:
      - `el(ref: ElemRef): Elem`
      - `group(ref: GroupRef): Group`
      - `viewport: Elem`
      - `screen: Elem`

- **Spec definition function**
  - Implement and export:
    - `function defineLayoutSpec(name: string, builder: SpecBuilder): LayoutSpec;`
  - Responsibilities:
    - construct a `LayoutCtx` instance,
    - invoke `builder(ctx)`,
    - capture:
      - all registered element/group references,
      - all registered constraint factories (functions from `RuntimeCtx` to `Constraint | Constraint[]`),
    - return an immutable `LayoutSpec` object containing this information.

- **Pure runtime engine (snapshot-based)**
  - Implement an internal function (e.g. `evaluateLayoutSpecOnSnapshots`) that:
    - accepts:
      - a `LayoutSpec`,
      - a snapshot store (e.g. `Record<string, ElemSnapshot[]>` keyed by `ElemRef`/`GroupRef` keys),
      - options (e.g. `viewTag`, view size metadata).
    - constructs `Elem`/`Group` instances and a `RuntimeCtx`,
    - instantiates all constraints via registered factories,
    - runs `check()` on each constraint and aggregates `Violation[]`.
  - Define and export:
    - `interface LayoutRunOptions { viewTag?: string }`
    - `interface LayoutReport { specName: string; viewTag?: string; viewSize: { width: number; height: number }; violations: Violation[] }`
  - Return `LayoutReport` from the runtime engine.

- **Public exports**
  - Update `uilint-core` index to export:
    - `LayoutCtx`, `LayoutSpec`, `SpecBuilder`, `LayoutRunOptions`, `LayoutReport`, `defineLayoutSpec`.
  - Keep the snapshot-based evaluation function either:
    - internal, or
    - exported as an advanced API (document appropriately later).

### 2. What needs to be implemented to test quality

- **Unit tests for `defineLayoutSpec`**
  - Add tests (e.g. `layout-spec.definition.test.ts`) that:
    - build a simple spec using `defineLayoutSpec` and a minimal DSL:
      - declare a few elements/groups via `ctx.el`/`ctx.group`,
      - register constraints via `ctx.must`/`ctx.mustRef`.
    - assert that:
      - returned `LayoutSpec.name` is correct,
      - internal collections of element/group references and constraint factories have expected sizes.

- **Unit tests for runtime evaluation**
  - Add tests (e.g. `layout-spec.runtime.test.ts`) that:
    - construct a synthetic snapshot store with a few `ElemSnapshot` instances (no Playwright).
    - evaluate a spec with `evaluateLayoutSpecOnSnapshots` (or the public equivalent).
    - verify that:
      - constraints receive correctly constructed `Elem`/`Group` instances.
      - `LayoutReport.specName` and `LayoutReport.viewSize` are set.
      - expected `Violation` objects are returned for failing constraints.
  - Include tests for:
    - missing snapshot data (e.g. unknown selector keys).
    - empty groups and optional `screen`/`viewport` use.

- **Refactoring safety**
  - Ensure all tests from Stages 2 and 3 (`Range`, `Elem`, relations, combinators, extras) still pass.

### 3. How to run tests to validate this stage

From the repository root:

- **Run only core tests**

```bash
pnpm test:core
```

- **Run the full suite**

```bash
pnpm test
```

At the end of this stage:

- Layout specs can be defined purely in `uilint-core` and evaluated against in-memory snapshots.
- All core tests (types, relations, combinators, extras, specs/runtime) must be green.


