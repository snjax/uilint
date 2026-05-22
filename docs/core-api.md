# Core API

The `@uilint/core` package provides the domain-specific language (DSL) for defining layout specifications. It is platform-agnostic and can be used with any runner (CLI, Playwright, etc.).

## Layout Spec

### `defineLayoutSpec(builder)`

Defines a reusable layout specification.

```ts
import { defineLayoutSpec } from '@uilint/core';

export const mySpec = defineLayoutSpec((ctx) => {
  // ... define elements and constraints
});
```

### `LayoutCtx`

The context object passed to the builder function.

-   **`ctx.el(selector, name?)`**: Defines an element.
    ```ts
    const header = ctx.el('header', 'App Header');
    ```
-   **`ctx.group(selector, name?)`**: Defines a group of elements.
    ```ts
    const cards = ctx.group('.card', 'Product Cards');
    ```
-   **`ctx.view`**: Represents the viewport (visible area).
-   **`ctx.canvas`**: Represents the entire document canvas (scrollable area).
-   **`ctx.must(...constraints)`**: Adds constraints that *must* be satisfied.

## Ranges

Ranges define valid numeric values for constraints.

-   **`eq(n)`**: Exactly `n`.
-   **`gt(n)`**: Greater than `n`.
-   **`gte(n)`**: Greater than or equal to `n`.
-   **`lt(n)`**: Less than `n`.
-   **`lte(n)`**: Less than or equal to `n`.
-   **`between(min, max)`**: Inclusive range `[min, max]`.
-   **`approx(n, tolerance)`**: `n ± tolerance`.
-   **`approxRelative(n, fraction)`**: `n ± (n * fraction)`.

## Constraints

### Positioning

-   **`inside(el, container, edges?, name?)`**: `el` is inside `container`.
    ```ts
    inside(logo, header, { left: eq(20), top: eq(0) })
    ```
-   **`below(a, b, range, name?)`**: `a` is below `b` by `range`. Formula: `a.top - b.bottom`.
-   **`above(a, b, range, name?)`**: `a` is above `b` by `range`. Formula: `b.top - a.bottom`.
-   **`leftOf(a, b, range, name?)`**: `a` is to the left of `b` by `range`. Formula: `b.left - a.right`.
-   **`rightOf(a, b, range, name?)`**: `a` is to the right of `b` by `range`. Formula: `a.left - b.right`.
-   **`near(a, b, options, name?)`**: `a` is near `b` on specified sides.
    ```ts
    near(tooltip, button, { top: eq(5), left: eq(0) })
    ```
-   **`on(el, ref, options, name?)`**: `el` is positioned on `ref` (edge-to-edge alignment).
    ```ts
    on(badge, avatar, { horizontal: { elementEdge: 'right', referenceEdge: 'right', range: eq(0) } })
    ```
-   **`centered(el, container, opts, name?)`**: `el` is centered within `container`.
    ```ts
    centered(logo, header, { h: eq(0) })           // horizontal centering
    centered(modal, view, { h: eq(0), v: eq(0) })  // both axes
    ```

### Dimensions

-   **`widthIn(el, range, name?)`**: Width matches `range`.
-   **`heightIn(el, range, name?)`**: Height matches `range`.
-   **`widthMatches(el, ref, options, name?)`**: Width matches `ref` width.
    ```ts
    widthMatches(card1, card2, { tolerance: 0.05 })  // within 5%
    widthMatches(card1, card2, { ratio: between(0.9, 1.1) })
    ```
-   **`heightMatches(el, ref, options, name?)`**: Height matches `ref` height.
-   **`almostSquared(el, tolerance?, name?)`**: Width ≈ height.
    Formula: `2 * |width - height| / (width + height) <= tolerance`.
    Default tolerance: 0.1 (10%).

### Alignment

-   **`alignedHorizontally(group, tolerance, name?)`**: Elements in `group` share same vertical center (centerY).
    Formula: `|elem[i].centerY - elem[0].centerY| <= tolerance`.
-   **`alignedVertically(group, tolerance, name?)`**: Elements in `group` share same horizontal center (centerX).
    Formula: `|elem[i].centerX - elem[0].centerX| <= tolerance`.
-   **`alignedHorizontallyTop(group, tolerance, name?)`**: Elements aligned by top edge.
-   **`alignedHorizontallyBottom(group, tolerance, name?)`**: Elements aligned by bottom edge.
-   **`alignedHorizontallyEdges(group, tolerance, name?)`**: Elements aligned by both top AND bottom.
-   **`alignedVerticallyLeft(group, tolerance, name?)`**: Elements aligned by left edge.
-   **`alignedVerticallyRight(group, tolerance, name?)`**: Elements aligned by right edge.
-   **`alignedVerticallyEdges(group, tolerance, name?)`**: Elements aligned by both left AND right.
-   **`alignedHorizEqualGap(group, gapTolerance, name?)`**: Equal horizontal gaps between elements.
    Formula: `|gap[i] - gap[0]| <= gapTolerance`.
-   **`alignedVertEqualGap(group, gapTolerance, name?)`**: Equal vertical gaps between elements.
-   **`noOverlap(group, opts?, name?)`**: Visible elements in `group` do not overlap in the `box` frame.
    `opts.tolerance` permits overlap in px on each axis. Invisible elements are ignored.

### Color

-   **`colorDistance(a, b, range, opts?, name?)`**: CIEDE2000 distance between two captured color channels.
    ```ts
    colorDistance(card, card, gte(MIN_TEXT_BG_DISTANCE))
    colorDistance(tab, activeTab, gte(MIN_ADJACENT_REGION_DISTANCE), {
      from: 'backgroundColor',
      to: 'backgroundColor',
    })
    ```
    `opts.from` selects the channel on `a`, and `opts.to` selects the channel on `b`.
    Defaults are `from: 'color'` and `to: 'backgroundColor'`, which models text-vs-background contrast.
    If the `to` background color is not opaque, the constraint reports an indeterminate violation instead of computing a distance; point the second argument at an element with a solid `background-color`.
    The common same-element form is `colorDistance(card, card, gte(MIN_TEXT_BG_DISTANCE))` when text and background sit on the same element.
-   **`MIN_TEXT_BG_DISTANCE`**: Recommended minimum CIEDE2000 text/background distance for comfortable legibility.
-   **`MIN_ADJACENT_REGION_DISTANCE`**: Recommended minimum CIEDE2000 distance for adjacent regions or states to read as visually distinct.

These thresholds are heuristic. CIEDE2000 has no standardized text-legibility cutoff, so calibrate them against your own design system.

### Visibility & Content

-   **`visible(el, expectVisible, name?)`**: Element visibility matches expected value.
    ```ts
    visible(header, true)   // must be visible
    visible(modal, false)   // must NOT be visible
    ```
-   **`present(el, expectPresent, name?)`**: Element presence in DOM matches expected value.
-   **`textEquals(el, text, name?)`**: Text content exactly matches.
-   **`textMatches(el, regex, name?)`**: Text content matches regex.
-   **`textDoesNotOverflow(el, name?)`**: Text fits within the element's bounding box.
-   **`textLinesAtMost(el, maxLines, name?)`**: Text renders in at most N lines.
-   **`singleLineText(el, name?)`**: Text does not wrap (combines overflow + maxLines=1).

### Logic & Groups

-   **`forAll(group, constraintFn, name?)`**: Applies constraint to every item in group (∀).
    ```ts
    forAll(cards, (card) => widthIn(card, between(200, 300)))
    ```
-   **`exists(group, constraintFn, name?)`**: At least one element satisfies the constraint (∃).
    ```ts
    exists(buttons, (btn) => textEquals(btn, 'Submit'))
    ```
-   **`none(group, constraintFn, name?)`**: No element satisfies the constraint (¬∃).
    ```ts
    none(errors, (err) => visible(err, true))
    ```
-   **`countIs(group, range, name?)`**: Number of elements in group matches `range`.
-   **`amountOfVisible(group, range, name?)`**: Number of visible elements matches `range`.

## Advanced

### `tableLayout(items, opts, name?)`

Verifies a grid/table structure.

```ts
tableLayout(
  cards, // The group of elements
  {
    columns: 3,
    horizontalMargin: between(16, 24),  // optional
    verticalMargin: between(16, 24),    // optional
  }
)
```

### `sidesHorizontallyInside(items, container, marginRange?, name?)`

Verifies a horizontal row is properly contained.

```ts
sidesHorizontallyInside(navItems, navbar, gte(0))
```

## Extending the DSL

### Ranges are predicates

`Range` is just `(value: number) => boolean`. Helpers such as `eq`, `gt`, `between`, and the other built-ins are optional sugar that attach a human-readable `desc` for error output. Any predicate works:

```ts
below(a, b, (value) => value > 0 && value < 20)
```

The set is open, so write your own range predicate when a built-in helper does not express the invariant clearly.

### Custom constraints

`ctx.must` and `forAll`/`exists`/`none` accept a `LayoutConstraint`: a function `(rt: RuntimeCtx) => ConstraintSource`. You may return a raw `Constraint` object `{ name: string; check(): Violation[] }`.

Inside constraints, `Elem` exposes `box`/`view`/`canvas`, `left`/`top`/`right`/`bottom`/`width`/`height`/`centerX`/`centerY`, `visible`/`present`, `text`, `textMetrics`, `color`, and `backgroundColor`.

`RuntimeCtx` exposes `el(ref)`, `group(ref)`, `view`, `canvas`, and `viewportClass`.

```ts
import { defineLayoutSpec } from '@uilint/core';
import type { ElemRef, LayoutConstraint } from '@uilint/core';

const minArea = (target: ElemRef, min: number): LayoutConstraint => (rt) => {
  const el = rt.el(target);
  const name = `minArea(${el.name})`;

  return {
    name,
    check() {
      const area = el.width * el.height;
      return area >= min
        ? []
        : [{
            constraint: name,
            message: `${el.name} area is too small`,
            details: { actual: area, expected: `>= ${min}` },
          }];
    },
  };
};

export const cardSpec = defineLayoutSpec((ctx) => {
  const card = ctx.el('.card', 'card');
  ctx.must(minArea(card, 4000));
});
```

## Utility Functions

-   **`pairwise(arr)`**: Creates pairs of adjacent elements. `[a, b, c]` → `[[a, b], [b, c]]`
-   **`windowed(arr, size)`**: Creates sliding windows. `windowed([a,b,c,d], 2)` → `[[a,b], [b,c], [c,d]]`
