## 2-core-types-and-ranges

This stage introduces the foundational data model and numeric abstractions used throughout **uilint**.

### 1. What needs to be implemented

- **Core geometry and element types in `uilint-core`**
  - Implement and export the following interfaces/types in `packages/uilint-core/src/`:
    - `ElemSnapshot` – matches the PRD (selector, optional index, geometry, visibility/presence, text, `meta`).
    - `Elem` – a runtime wrapper with:
      - `name: string`
      - `snap: ElemSnapshot`
      - read-only getters: `left`, `top`, `right`, `bottom`, `width`, `height`, `centerX`, `centerY`
      - visibility flags and text: `visible`, `present`, `text`
      - optional `findChild?(key: string): Elem | undefined`
    - `Group = Elem[]`
  - Implement a factory (or internal helper) for constructing `Elem` from an `ElemSnapshot` and a logical `name`.

- **Range abstraction**
  - Implement the `Range` type as:
    - `type Range = (value: number) => boolean;`
  - Implement and export basic range constructors (as per PRD):
    - `eq(target: number): Range`
    - `gt(target: number): Range`
    - `gte(target: number): Range`
    - `lt(target: number): Range`
    - `lte(target: number): Range`
    - `between(min: number, max: number): Range`
    - `approx(target: number, tolerance: number): Range`
    - `any: Range`
  - Document (in comments) the semantics and typical use cases of each constructor.

- **Violation and Constraint**
  - Implement and export:
    - `interface Violation { constraint: string; message: string; details?: any }`
    - `interface Constraint { name: string; check(): Violation[] }`
  - Keep `Constraint` purely synchronous; do not depend on Playwright types here.

- **Public entrypoint**
  - Ensure `packages/uilint-core/src/index.ts` re-exports:
    - `ElemSnapshot`, `Elem`, `Group`
    - `Range` and all range constructors
    - `Violation`, `Constraint`

### 2. What needs to be implemented to test quality

- **Unit tests for `Range`**
  - Add `range.test.ts` under `packages/uilint-core/src/__tests__/` (or similar) to verify:
    - `eq`, `gt`, `gte`, `lt`, `lte`, `between`, `approx`, and `any` return expected results for:
      - boundary values (exact match, min/max),
      - typical “inside range” values,
      - typical “outside range” values.
    - `approx` respects the `tolerance` parameter precisely (just inside vs just outside tolerance).

- **Unit tests for `Elem`**
  - Add `elem.test.ts` to verify:
    - getters (`left`, `top`, `right`, `bottom`, `width`, `height`) reflect values from `ElemSnapshot`.
    - `centerX` and `centerY` are computed correctly.
    - `visible`, `present`, and `text` mirror `ElemSnapshot`.
    - `findChild` (if initially implemented) returns expected elements or `undefined`.

- **Type-level sanity checks**
  - Optionally add a type test file (e.g. `types.test-d.ts` using `tsd` or similar) to ensure:
    - `ElemSnapshot`, `Elem`, `Group`, `Range`, `Constraint`, and `Violation` have the expected shapes.
    - public exports from `uilint-core` are stable and well-typed.

### 3. How to run tests to validate this stage

From the repository root (after Stage 1 is completed):

- **Run only core tests**

```bash
pnpm test:core
```

- **Or run all tests (including smoke tests from other stages)**

```bash
pnpm test
```

At the end of this stage:

- All `Range` and `Elem` tests should be green.
- There should be no TypeScript or ESLint errors in `packages/uilint-core`.


