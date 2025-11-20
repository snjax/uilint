# Best Practices

## The Art of Layout Constraints

Writing layout specs is different from writing functional tests. In functional tests, you often check for the *presence* of an element. In layout linting, you must check its *position* and *relationship* to everything else.

**The Golden Rule: If it can move, constrain it.**

A spec with only `visible(header)` is weak. It won't catch if the header overlaps the content, if it's 1px tall, or if it's floating in the middle of the screen.

### 1. Constrain All Sides
Ideally, every element should be "pinned" in space relative to its container or neighbors.

**Weak Spec:**
```ts
// Only checks if it's roughly in the right place
below(footer, main)
```

**Strong Spec:**
```ts
// Pins the footer completely
below(footer, main, between(20, 50)), // Vertical position
inside(footer, ctx.view, {
  left: eq(0),   // Horizontal position (left edge)
  right: eq(0),  // Horizontal position (right edge)
  bottom: eq(0)  // Vertical position (bottom edge)
})
```

### 2. Use Semantic Relationships
Describe *intent*, not just coordinates.

-   **Bad**: `inside(logo, header, { top: eq(10), left: eq(20) })` (Fragile magic numbers)
-   **Good**: `centered(logo, header)` (Captures the design intent)
-   **Good**: `alignedHorizontally([icon, text], centered)` (Ensures alignment regardless of exact position)

### 3. Don't Ignore Dimensions
Elements often collapse or expand unexpectedly. Constrain their size.

```ts
widthIn(button, between(100, 200)),
heightIn(header, eq(60)),
ratio(cardImage, 16/9)
```

### 4. The "Mesh" Strategy
Imagine a mesh connecting all your elements.
-   Header connects to Viewport (Top, Left, Right).
-   Main connects to Header (Below).
-   Sidebar connects to Main (LeftOf) and Header (Below).
-   Footer connects to Main (Below) and Viewport (Bottom).

If you break any link in this chain, an element is free to "float" and cause regressions.

## Project Structure


## Writing Specs

### Reusable Components
Define specs for common components (like headers, footers, cards) and reuse them across different page specs.

```ts
// specs/components/header.ts
export const headerSpec = defineLayoutSpec(ctx => { ... });

// specs/homepage.ts
import { headerSpec } from './components/header';

export const homepageSpec = defineLayoutSpec(ctx => {
  // You can compose specs (future feature) or just define page-specific rules
  // For now, keep specs focused on the specific view you are testing.
});
```

### Robust Selectors
Use `data-testid` or other stable attributes. Avoid tying your layout tests to fragile CSS classes that might change for styling reasons without affecting the layout.

## Scenarios

### Keep It Simple
Scenarios should be focused on **getting to the state** you want to test. Avoid complex logic or assertions inside the scenario script itself—let `uilint` handle the assertions via the spec.

### Wait for Stability
If your page has animations or async data loading, ensure the scenario waits for the page to stabilize before taking a snapshot.

```ts
await runtime.page.waitForSelector('.content-loaded');
await runtime.snapshot('ready', spec);
```

## CI/CD Integration

Run `uilint layout` as part of your pull request checks. Since `uilint` builds and serves your app, it ensures that the actual production build is verified.

```yaml
# Example GitHub Action step
- name: Layout Check
  run: npx uilint layout
```
