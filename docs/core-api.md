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
-   **`ctx.viewportClass`**: The current viewport class (`'mobile' | 'tablet' | 'desktop'`).
-   **`ctx.viewTag`**: A custom tag passed from the runner (e.g., `'dark-mode'`).

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

-   **`inside(el, container, edges?)`**: `el` is inside `container`.
    ```ts
    inside(logo, header, { left: eq(20), top: centered })
    ```
-   **`below(a, b, range)`**: `a` is below `b` by `range`.
-   **`above(a, b, range)`**: `a` is above `b` by `range`.
-   **`leftOf(a, b, range)`**: `a` is to the left of `b` by `range`.
-   **`rightOf(a, b, range)`**: `a` is to the right of `b` by `range`.
-   **`near(a, b, options)`**: `a` is near `b` on specified sides.
-   **`on(a, b, options)`**: `a` is positioned on `b` (e.g., aligned edges).
-   **`centered(el, container, axis?)`**: `el` is centered within `container`.
    -   `axis`: `'horizontally'`, `'vertically'`, or omitted for both.

### Dimensions

-   **`widthIn(el, range)`**: Width matches `range`.
-   **`heightIn(el, range)`**: Height matches `range`.
-   **`widthMatches(el, ref, options)`**: Width matches `ref` width (with tolerance/ratio).
-   **`heightMatches(el, ref, options)`**: Height matches `ref` height.
-   **`almostSquared(el, tolerance?)`**: Width approx equals height.

### Alignment

-   **`alignedHorizontally(group, mode?)`**: Elements in `group` are aligned horizontally.
    -   `mode`: `'top'`, `'bottom'`, `'centered'`, `'edges'` (default: `'top'`).
-   **`alignedVertically(group, mode?)`**: Elements in `group` are aligned vertically.
    -   `mode`: `'left'`, `'right'`, `'centered'`, `'edges'` (default: `'left'`).
-   **`alignedHorizEqualGap(group, range)`**: Elements are distributed horizontally with equal gaps.
-   **`alignedVertEqualGap(group, range)`**: Elements are distributed vertically with equal gaps.

### Visibility & Content

-   **`visible(el)`**: Element is visible (opacity > 0, visibility != hidden, etc.).
-   **`present(el)`**: Element exists in the DOM (even if hidden).
-   **`textEquals(el, text)`**: Text content exactly matches.
-   **`textMatches(el, regex)`**: Text content matches regex.
-   **`textDoesNotOverflow(el)`**: Text fits within the element's bounding box.
-   **`singleLineText(el)`**: Text does not wrap.

### Logic & Groups

-   **`forAll(group, constraintFn)`**: Applies constraint to every item in group.
    ```ts
    forAll(cards, (card) => widthIn(card, between(200, 300)))
    ```
-   **`countIs(group, range)`**: Number of elements in group matches `range`.
-   **`exists(el)`**: Alias for `present`.
-   **`none(group)`**: Group is empty.

## Advanced

### `tableLayout(rows, cols, options?)`

Verifies a grid/table structure.

```ts
tableLayout(
  cards, // The group of elements
  3,     // Columns
  {
    horizontalGap: eq(20),
    verticalGap: eq(20)
  }
)
```
