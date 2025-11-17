## 3-core-relations-combinators-and-extras

This stage implements the main layout relations, group-level combinators, and MVP extras in **uilint-core**.

### 1. What needs to be implemented

- **Primitive positional relations**
  - Implement functions operating on `Elem` and `Range`:
    - `below(a: Elem, b: Elem, range: Range, name?: string): Constraint`
    - `above(a: Elem, b: Elem, range: Range, name?: string): Constraint`
    - `leftOf(a: Elem, b: Elem, range: Range, name?: string): Constraint`
    - `rightOf(a: Elem, b: Elem, range: Range, name?: string): Constraint`
  - Follow the semantics from the PRD, e.g.:
    - `below(a, b, range)` checks `a.top - b.bottom` against `range`.

- **Containment and sizing**
  - Implement:
    - `interface EdgeRanges { top?: Range; right?: Range; bottom?: Range; left?: Range }`
    - `inside(a: Elem, b: Elem, edges: EdgeRanges, name?: string): Constraint`
      - checks:
        - `a.left - b.left` against `edges.left`
        - `b.right - a.right` against `edges.right`
        - `a.top - b.top` against `edges.top`
        - `b.bottom - a.bottom` against `edges.bottom`
    - `widthIn(e: Elem, range: Range, name?: string): Constraint`
    - `heightIn(e: Elem, range: Range, name?: string): Constraint`
    - `ratio(a: number, b: number, expected: number, tolerance: number, name?: string): Constraint`

- **Alignment and centering**
  - Implement:
    - `alignedHorizontally(elems: Group, tolerance: number, name?: string): Constraint`
    - `alignedVertically(elems: Group, tolerance: number, name?: string): Constraint`
    - `centered(a: Elem, b: Elem, opts: { h?: Range; v?: Range }, name?: string): Constraint`
  - Ensure implementations are robust for:
    - empty groups,
    - single-element groups,
    - typical multi-element groups.

- **Visibility and text-based checks**
  - Implement:
    - `visible(e: Elem, expectVisible: boolean, name?: string): Constraint`
    - `present(e: Elem, expectPresent: boolean, name?: string): Constraint`
    - `textEquals(e: Elem, expected: string, name?: string): Constraint`
    - `textMatches(e: Elem, re: RegExp | string, name?: string): Constraint`
  - Implement clear, human-readable `Violation.message` values for failed checks.

- **Group-level combinators**
  - Implement quantifiers:
    - `forAll(elems: Group, mk: (e: Elem) => Constraint | Constraint[], name?: string): Constraint`
    - `exists(elems: Group, mk: (e: Elem) => Constraint | Constraint[], name?: string): Constraint`
    - `none(elems: Group, mk: (e: Elem) => Constraint | Constraint[], name?: string): Constraint`
  - Implement count-based checks:
    - `countIs(elems: Group, range: Range, name?: string): Constraint`
    - `amountOfVisible(elems: Group, range: Range, name?: string): Constraint`
  - Implement helpers:
    - `pairwise<T>(arr: T[]): [T, T][]`
    - `windowed<T>(arr: T[], size: number): T[][]`
  - Use `lodash` internally where convenient (`_.flatMap`, `_.some`, `_.every`, `_.sortBy`, etc.), but keep the public API independent of lodash types.

- **Extras (MVP set)**
  - Implement extras as thin wrappers over primitives/combinators:
    - `almostSquared(e: Elem, tolerance = 0.1, name = 'almostSquared'): Constraint`
      - built on top of `ratio(e.width, e.height, 1, tolerance, name)`.
    - `alignedHorizEqualGap(items: Group, gapTolerance: number, name = 'equalGap'): Constraint`
      - use `pairwise` to compute horizontal gaps and compare them against the first gap.
    - `tableLayout(items: Group, opts: TableLayoutOpts, name = 'tableLayout'): Constraint`
      - follow the PRD: sortable rows, column count and horizontal/vertical margin checks.
    - `sidesHorizontallyInside(items: Group, container: Elem, marginRange: Range = v => v >= 0, name = 'sidesHorizontallyInside'): Constraint`
      - ensure the first/last items respect the container’s left/right margins and that items are ordered and aligned.
  - Export any small supporting interfaces (e.g. `TableLayoutOpts`) from the core package.

- **Public exports**
  - Update `packages/uilint-core/src/index.ts` to re-export all primitives, combinators, helpers, and extras implemented in this stage.

### 2. What needs to be implemented to test quality

- **Unit tests for primitive relations**
  - Add test files (e.g. `relations.position.test.ts`, `relations.size-and-ratio.test.ts`) that:
    - Build small `Elem` instances from in-memory `ElemSnapshot` values.
    - Cover positive and negative cases for:
      - `below`, `above`, `leftOf`, `rightOf`
      - `inside`
      - `widthIn`, `heightIn`, `ratio`
    - Verify that:
      - when the range condition holds, `check()` returns an empty array.
      - when the range condition fails, `check()` returns at least one `Violation` with meaningful `message` and `constraint` fields.

- **Unit tests for alignment, visibility, and text**
  - Add tests (e.g. `relations.alignment-and-visibility.test.ts`) that:
    - check aligned and misaligned groups (horizontal and vertical).
    - verify `centered` works for both axes separately and jointly.
    - validate `visible`, `present`, `textEquals`, `textMatches` for:
      - expected success cases,
      - mismatches (visibility off, different text, regex mismatch).

- **Unit tests for combinators and helpers**
  - Add tests that:
    - verify `forAll`, `exists`, `none` behave like logical quantifiers.
    - verify `countIs` and `amountOfVisible` enforce ranges on array length and visible count.
    - ensure `pairwise` and `windowed`:
      - handle empty and small arrays correctly,
      - produce expected pairs/windows for typical cases.

- **Unit tests for extras**
  - Add tests (e.g. `extras.test.ts`) that:
    - cover `almostSquared` for nearly-square and clearly non-square rectangles.
    - validate `alignedHorizEqualGap` with equal and unequal gaps.
    - test `tableLayout` for:
      - correct number of columns,
      - horizontal and vertical margin ranges,
      - edge cases like empty or single-row layouts.
    - test `sidesHorizontallyInside` for:
      - items correctly inside a container,
      - too small/too large margins,
      - broken ordering or mismatched heights/tops.

- **Regression safety**
  - Ensure tests from Stage 2 (`Range`, `Elem`) continue to pass.

### 3. How to run tests to validate this stage

From the repository root:

- **Run only core tests (preferred during this stage)**

```bash
pnpm test:core
```

- **Run the whole suite**

```bash
pnpm test
```

At the end of this stage:

- All tests for primitives, combinators, and extras should pass.
- No new lint or type errors should appear in `packages/uilint-core`.


