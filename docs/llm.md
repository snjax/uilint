# LLM Agent Guide for uilint

This document is a comprehensive reference for AI coding assistants (LLMs) working with the `uilint` codebase. It consolidates all essential information needed to generate correct, idiomatic code.

## Overview

`uilint` is a **layout linting framework** for web applications. It allows developers to define declarative constraints describing how UI elements should be positioned, sized, and aligned. The framework then verifies these constraints against a running application.

**Key Packages:**

| Package | npm | Purpose |
|---------|-----|---------|
| `@uilint/core` | [npm](https://www.npmjs.com/package/@uilint/core) | Constraint DSL, geometry primitives, runtime engine |
| `@uilint/playwright` | [npm](https://www.npmjs.com/package/@uilint/playwright) | Playwright adapter, matchers, snapshot runner |
| `@uilint/cli` | [npm](https://www.npmjs.com/package/@uilint/cli) | Config-driven CLI for running layout checks |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         @uilint/cli                             │
│  - Config loading (uilint.config.ts)                            │
│  - Build orchestration                                          │
│  - Static server                                                │
│  - Scenario execution                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      @uilint/playwright                         │
│  - Browser automation via Playwright                            │
│  - DOM snapshot collection                                      │
│  - Custom matchers (toMatchLayout)                              │
│  - Report generation                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        @uilint/core                             │
│  - Constraint DSL (inside, below, centered, etc.)               │
│  - Range definitions (eq, between, gt, lt, etc.)                │
│  - Layout spec builder (defineLayoutSpec)                       │
│  - Constraint evaluation engine                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Layout Spec

A **Layout Spec** defines the rules a UI must follow. It is created using `defineLayoutSpec`:

```typescript
import { defineLayoutSpec, inside, below, centered, eq, between } from '@uilint/core';

export const mySpec = defineLayoutSpec((ctx) => {
  // 1. Define elements using CSS selectors
  const header = ctx.el('header');
  const logo = ctx.el('[data-testid="logo"]');
  const main = ctx.el('main');
  const footer = ctx.el('footer');

  // 2. Define constraints
  ctx.must(
    inside(header, ctx.view, { top: eq(0), left: eq(0), right: eq(0) }),
    centered(logo, header),
    below(main, header, between(0, 20)),
    below(footer, main, between(10, 50))
  );
});
```

### 2. Scenario

A **Scenario** drives the browser to a specific state and captures snapshots:

```typescript
import { defineScenario } from '@uilint/cli';
import { mySpec } from '../specs/mySpec';

export default defineScenario('my-scenario', async (runtime) => {
  await runtime.goto('/');
  await runtime.page.waitForSelector('main');
  await runtime.snapshot('homepage', mySpec);
});
```

### 3. Configuration

The CLI uses `uilint.config.ts`:

```typescript
import { defineUilintConfig } from '@uilint/cli';

export default defineUilintConfig({
  layout: {
    build: 'npm run build',
    distDir: './dist',
    server: { port: 3000 },
    scenarios: {
      'homepage': {
        module: './uilint/scenarios/homepage.ts',
        viewports: ['mobile', 'desktop'],
      },
    },
  },
});
```

## Complete API Reference

### Context API (`ctx`)

| Method/Property | Description | Example |
|-----------------|-------------|---------|
| `ctx.el(selector, name?)` | Define a single element | `ctx.el('header')` |
| `ctx.group(selector, name?)` | Define a group of elements | `ctx.group('.card')` |
| `ctx.view` | The viewport (visible area) | `inside(el, ctx.view)` |
| `ctx.canvas` | The document canvas (scrollable) | `inside(el, ctx.canvas)` |
| `ctx.must(...constraints)` | Add required constraints | `ctx.must(visible(el, true))` |
| `ctx.viewportClass` | Current viewport class | `'mobile' \| 'tablet' \| 'desktop'` |
| `ctx.viewTag` | Custom tag from runner | `'dark-mode'` |

### Ranges

Ranges define valid numeric values:

| Range | Description | Example |
|-------|-------------|---------|
| `eq(n)` | Exactly `n` | `eq(60)` |
| `gt(n)` | Greater than `n` | `gt(0)` |
| `gte(n)` | Greater than or equal to `n` | `gte(100)` |
| `lt(n)` | Less than `n` | `lt(500)` |
| `lte(n)` | Less than or equal to `n` | `lte(1200)` |
| `between(min, max)` | Inclusive range `[min, max]` | `between(10, 50)` |
| `approx(n, tolerance)` | `n ± tolerance` | `approx(100, 5)` |
| `approxRelative(n, fraction)` | `n ± (n * fraction)` | `approxRelative(100, 0.1)` |

### Positioning Constraints

| Constraint | Description | Signature |
|------------|-------------|-----------|
| `inside(el, container, edges?, name?)` | Element is inside container | `inside(logo, header, { left: eq(20) })` |
| `below(a, b, range, name?)` | `a` is below `b` by `range` | `below(main, header, between(0, 20))` |
| `above(a, b, range, name?)` | `a` is above `b` by `range` | `above(header, main, eq(0))` |
| `leftOf(a, b, range, name?)` | `a` is left of `b` by `range` | `leftOf(icon, text, eq(10))` |
| `rightOf(a, b, range, name?)` | `a` is right of `b` by `range` | `rightOf(text, icon, eq(10))` |
| `near(a, b, options, name?)` | `a` is near `b` on specified sides | `near(tooltip, button, { top: eq(5) })` |
| `on(el, ref, options, name?)` | `el` is positioned on `ref` | `on(badge, avatar, { horizontal: {...} })` |
| `centered(el, container, opts, name?)` | Element is centered | `centered(logo, header, { h: eq(0) })` |

**`inside` edge options:**
```typescript
inside(el, container, {
  top: eq(0),      // Distance from container top
  bottom: eq(0),   // Distance from container bottom
  left: eq(0),     // Distance from container left
  right: eq(0),    // Distance from container right
})
```

**`centered` opts:** `{ h?: Range, v?: Range }` for horizontal/vertical centering.
```typescript
centered(logo, header, { h: eq(0) })           // horizontal only
centered(modal, view, { h: eq(0), v: eq(0) })  // both axes
```

**`on` options:**
```typescript
on(badge, avatar, {
  horizontal: { elementEdge: 'right', referenceEdge: 'right', range: eq(0) },
  vertical: { elementEdge: 'top', referenceEdge: 'top', range: eq(0) }
})
```

### Dimension Constraints

| Constraint | Description | Signature |
|------------|-------------|-----------|
| `widthIn(el, range, name?)` | Width matches range | `widthIn(card, between(200, 400))` |
| `heightIn(el, range, name?)` | Height matches range | `heightIn(header, eq(60))` |
| `widthMatches(el, ref, options, name?)` | Width matches reference | `widthMatches(card1, card2, { tolerance: 0.05 })` |
| `heightMatches(el, ref, options, name?)` | Height matches reference | `heightMatches(row1, row2, { ratio: eq(1) })` |
| `almostSquared(el, tolerance?, name?)` | Width ≈ height | `almostSquared(avatar, 0.1)` |

**`widthMatches`/`heightMatches` options:** `{ tolerance?: number, ratio?: Range }`
- `tolerance`: relative tolerance (0.05 = 5%)
- `ratio`: range for dimension ratio

**`almostSquared` formula:** `2 * |width - height| / (width + height) <= tolerance`
Default tolerance: 0.1 (10%).

### Alignment Constraints

| Constraint | Description | Signature |
|------------|-------------|-----------|
| `alignedHorizontally(group, tolerance, name?)` | Same centerY | `alignedHorizontally(navItems, 2)` |
| `alignedVertically(group, tolerance, name?)` | Same centerX | `alignedVertically(menuItems, 2)` |
| `alignedHorizontallyTop(group, tolerance, name?)` | Same top edge | `alignedHorizontallyTop(cards, 1)` |
| `alignedHorizontallyBottom(group, tolerance, name?)` | Same bottom edge | `alignedHorizontallyBottom(items, 1)` |
| `alignedHorizontallyEdges(group, tolerance, name?)` | Same top AND bottom | `alignedHorizontallyEdges(row, 1)` |
| `alignedVerticallyLeft(group, tolerance, name?)` | Same left edge | `alignedVerticallyLeft(fields, 1)` |
| `alignedVerticallyRight(group, tolerance, name?)` | Same right edge | `alignedVerticallyRight(buttons, 1)` |
| `alignedVerticallyEdges(group, tolerance, name?)` | Same left AND right | `alignedVerticallyEdges(cards, 1)` |
| `alignedHorizEqualGap(group, gapTolerance, name?)` | Equal horizontal gaps | `alignedHorizEqualGap(cards, 5)` |
| `alignedVertEqualGap(group, gapTolerance, name?)` | Equal vertical gaps | `alignedVertEqualGap(listItems, 5)` |

**Tolerance**: maximum allowed pixel deviation from baseline (first element).

**Formulas:**
- `alignedHorizontally`: `|elem[i].centerY - elem[0].centerY| <= tolerance`
- `alignedVertically`: `|elem[i].centerX - elem[0].centerX| <= tolerance`
- `alignedHorizEqualGap`: `|gap[i] - gap[0]| <= gapTolerance`

### Visibility & Content Constraints

| Constraint | Description | Signature |
|------------|-------------|-----------|
| `visible(el, expectVisible, name?)` | Visibility matches expected | `visible(header, true)` |
| `present(el, expectPresent, name?)` | Presence matches expected | `present(modal, false)` |
| `textEquals(el, text, name?)` | Exact text match | `textEquals(title, 'Welcome')` |
| `textMatches(el, regex, name?)` | Text matches regex | `textMatches(price, /\$\d+/)` |
| `textDoesNotOverflow(el, name?)` | Text fits in element | `textDoesNotOverflow(button)` |
| `textLinesAtMost(el, maxLines, name?)` | Text renders in ≤N lines | `textLinesAtMost(desc, 3)` |
| `singleLineText(el, name?)` | Text doesn't wrap | `singleLineText(label)` |

**`visible`/`present` second parameter:** `true` = must be visible/present, `false` = must NOT be.

### Group & Logic Constraints

| Constraint | Description | Signature |
|------------|-------------|-----------|
| `forAll(group, constraintFn, name?)` | All items must satisfy (∀) | `forAll(cards, c => widthIn(c, eq(200)))` |
| `exists(group, constraintFn, name?)` | At least one satisfies (∃) | `exists(btns, b => textEquals(b, 'OK'))` |
| `none(group, constraintFn, name?)` | No item satisfies (¬∃) | `none(errors, e => visible(e, true))` |
| `countIs(group, range, name?)` | Count matches range | `countIs(items, between(3, 6))` |
| `amountOfVisible(group, range, name?)` | Visible count matches | `amountOfVisible(tabs, gte(1))` |

### Table/Grid Layout

```typescript
tableLayout(
  cards,  // Group of elements
  {
    columns: 3,                          // Required: max columns per row
    horizontalMargin: between(16, 24),   // Optional: gap between columns
    verticalMargin: between(16, 24),     // Optional: gap between rows
  },
  'cardGrid'  // Optional: constraint name
)
```

### `sidesHorizontallyInside`

Verifies a horizontal row is properly contained within a container.

```typescript
sidesHorizontallyInside(navItems, navbar, gte(0), 'navLayout')
```

## Responsive Design Patterns

Use `ctx.viewportClass` to write responsive constraints:

```typescript
export const responsiveSpec = defineLayoutSpec((ctx) => {
  const sidebar = ctx.el('#sidebar');
  const content = ctx.el('#content');

  ctx.must((rt) => {
    const constraints = [];

    if (rt.viewportClass === 'desktop') {
      constraints.push(
        leftOf(sidebar, content, eq(0)),
        widthIn(sidebar, eq(250))
      );
    } else {
      // Mobile: sidebar hidden or full-width
      constraints.push(
        widthIn(content, between(300, 500))
      );
    }

    return constraints;
  });
});
```

## Playwright Integration

### Direct Integration (without CLI)

```typescript
// playwright.config.ts or test setup
import { expect } from '@playwright/test';
import { installUilintMatchers } from '@uilint/playwright';

installUilintMatchers(expect);
```

### Using the Matcher

```typescript
import { test, expect } from '@playwright/test';
import { loginSpec } from './specs/loginSpec';

test('login page layout', async ({ page }, testInfo) => {
  await page.goto('/login');
  await page.waitForSelector('.login-form');
  
  // Basic usage
  await expect(page).toMatchLayout(loginSpec);
  
  // With options (attaches full report on failure)
  await expect(page).toMatchLayout(loginSpec, { 
    testInfo,
    viewTag: 'mobile' 
  });
});
```

### Programmatic Access

```typescript
import { runLayoutSpec } from '@uilint/playwright';

test('custom handling', async ({ page }) => {
  const report = await runLayoutSpec(page, mySpec);
  
  if (report.violations.length > 0) {
    console.log(`Found ${report.violations.length} violations`);
    // Custom logic...
  }
});
```

## Runtime API (Scenarios)

| Method/Property | Description |
|-----------------|-------------|
| `runtime.page` | Playwright `Page` instance |
| `runtime.viewport` | Current viewport `{ name, size }` |
| `runtime.viewportClass` | `'mobile' \| 'tablet' \| 'desktop'` |
| `runtime.baseUrl` | Base URL of local server |
| `runtime.goto(path, options?)` | Navigate relative to baseUrl |
| `runtime.snapshot(name, spec, options?)` | Capture and validate snapshot |

## Built-in Viewports

| Name | Dimensions |
|------|------------|
| `mobile` | 375×667 |
| `tablet` | 768×1024 |
| `desktop` | 1280×800 |

Custom viewports can be defined in config:

```typescript
viewports: {
  'ultrawide': { width: 2560, height: 1080 },
  'tiny': { width: 320, height: 480 },
}
```

## Code Generation Guidelines

### DO ✓

1. **Always use stable selectors:**
   ```typescript
   // Good
   ctx.el('[data-testid="header"]')
   ctx.el('#main-nav')
   
   // Avoid
   ctx.el('.css-1a2b3c')  // Generated class names
   ctx.el('div > div > span')  // Fragile structure
   ```

2. **Constrain all sides of important elements:**
   ```typescript
   // Complete constraint - element is "pinned"
   inside(header, ctx.view, {
     top: eq(0),
     left: eq(0),
     right: eq(0)
   }),
   heightIn(header, eq(60))
   ```

3. **Use semantic constraints over coordinates:**
   ```typescript
   // Good - captures intent
   centered(logo, header, { h: eq(0) })
   alignedHorizontally([icon, text], 2)
   
   // Avoid - magic numbers
   inside(logo, header, { top: eq(10), left: eq(20) })
   ```

4. **Wait for page stability before snapshots:**
   ```typescript
   await runtime.page.waitForSelector('.content-loaded');
   await runtime.snapshot('ready', spec);
   ```

5. **Use ranges for flexible constraints:**
   ```typescript
   // Good - allows some flexibility
   below(footer, main, between(10, 30))
   widthIn(card, between(200, 400))
   
   // Too strict - may break on minor changes
   below(footer, main, eq(20))
   ```

### DON'T ✗

1. **Don't use only visibility checks:**
   ```typescript
   // Weak - doesn't catch position/size issues
   ctx.must(visible(header, true))
   
   // Strong - fully constrained
   ctx.must(
     visible(header, true),
     inside(header, ctx.view, { top: eq(0), left: eq(0), right: eq(0) }),
     heightIn(header, eq(60))
   )
   ```

2. **Don't put assertions in scenarios:**
   ```typescript
   // Bad - assertions belong in specs
   export default defineScenario('test', async (runtime) => {
     await runtime.goto('/');
     expect(await runtime.page.title()).toBe('Home');  // Don't do this
     await runtime.snapshot('home', homeSpec);
   });
   ```

3. **Don't forget responsive constraints:**
   ```typescript
   // Bad - only works on one viewport
   widthIn(sidebar, eq(250))
   
   // Good - adapts to viewport
   ctx.must((rt) => {
     if (rt.viewportClass === 'desktop') {
       return [widthIn(sidebar, eq(250))];
     }
     return [];  // Sidebar hidden on mobile
   });
   ```

## Common Patterns

### Header Layout

```typescript
const headerSpec = defineLayoutSpec((ctx) => {
  const header = ctx.el('header');
  const logo = ctx.el('[data-testid="logo"]');
  const nav = ctx.el('nav');
  const navItems = ctx.group('nav a');

  ctx.must(
    inside(header, ctx.view, { top: eq(0), left: eq(0), right: eq(0) }),
    heightIn(header, between(50, 80)),
    inside(logo, header),
    inside(nav, header),
    alignedHorizontally(navItems, 2),
    alignedHorizEqualGap(navItems, 10)
  );
});
```

### Card Grid

```typescript
const cardGridSpec = defineLayoutSpec((ctx) => {
  const grid = ctx.el('.card-grid');
  const cards = ctx.group('.card');

  ctx.must((rt) => {
    const constraints = [
      countIs(cards, gte(1)),
      forAll(cards, (card) => [
        widthIn(card, between(200, 400)),
        inside(card, grid)
      ])
    ];

    if (rt.viewportClass === 'desktop') {
      constraints.push(
        tableLayout(cards, { columns: 3, horizontalMargin: eq(20), verticalMargin: eq(20) })
      );
    } else {
      constraints.push(
        alignedVertically(cards, 2),
        alignedVertEqualGap(cards, 5)
      );
    }

    return constraints;
  });
});
```

### Form Layout

```typescript
const formSpec = defineLayoutSpec((ctx) => {
  const form = ctx.el('form');
  const fields = ctx.group('.form-field');
  const labels = ctx.group('.form-label');
  const inputs = ctx.group('.form-input');
  const submitBtn = ctx.el('[type="submit"]');

  ctx.must(
    alignedVerticallyLeft(fields, 1),
    alignedVertEqualGap(fields, 5),
    forAll(labels, (label) => singleLineText(label)),
    forAll(inputs, (input) => widthIn(input, gte(200))),
    below(submitBtn, fields, between(20, 40)),
    centered(submitBtn, form, { h: eq(0) })
  );
});
```

### Modal/Dialog

```typescript
const modalSpec = defineLayoutSpec((ctx) => {
  const overlay = ctx.el('.modal-overlay');
  const modal = ctx.el('.modal');
  const closeBtn = ctx.el('.modal-close');
  const content = ctx.el('.modal-content');

  ctx.must(
    inside(overlay, ctx.view, { top: eq(0), left: eq(0), right: eq(0), bottom: eq(0) }),
    centered(modal, ctx.view),
    widthIn(modal, between(300, 600)),
    inside(closeBtn, modal, { top: between(10, 20), right: between(10, 20) }),
    inside(content, modal)
  );
});
```

## File Structure Convention

```
project/
├── uilint.config.ts          # CLI configuration
├── uilint/
│   ├── specs/                # Layout specifications
│   │   ├── components/       # Reusable component specs
│   │   │   ├── header.ts
│   │   │   ├── footer.ts
│   │   │   └── card.ts
│   │   ├── homepage.ts       # Page-specific specs
│   │   └── dashboard.ts
│   └── scenarios/            # Test scenarios
│       ├── homepage.ts
│       └── dashboard.ts
```

## Error Handling

When constraints fail, the report includes:
- **Constraint name**: Which constraint failed (e.g., `inside(header,view).top`)
- **Expected value**: What was expected (from ranges or constraint parameters)
- **Actual value**: What was measured
- **Message**: Human-readable description

### Console Output Format

Violations are displayed in a concise format:

```
- below(main,header): Vertical gap is out of range, got 45, expected [0, 20]
- alignedHorizontally[1]: centerY delta exceeds tolerance, got 5, expected <= 2
- visible(modal): element is not visible, got false, expected true
- widthIn(card): width is out of range, got 180, expected [200, 400]
```

### JSON Report Structure

```json
{
  "constraint": "inside(header,view).top",
  "message": "Top edge offset (header.top - view.top) is out of range",
  "details": {
    "actual": 10,
    "expected": "== 0"
  }
}
```

The `details` object always includes `actual` and `expected` fields for programmatic processing.

## Testing Workflow

1. **Initialize:** `npx uilint init`
2. **Write specs:** Define constraints in `uilint/specs/`
3. **Write scenarios:** Define navigation in `uilint/scenarios/`
4. **Configure:** Set up viewports and scenarios in `uilint.config.ts`
5. **Run:** `npx uilint layout`
6. **CI/CD:** Add to pipeline for regression detection

## Summary

When generating uilint code:

1. Import from `@uilint/core` for specs, `@uilint/cli` for scenarios
2. Use `defineLayoutSpec` to create specs with `ctx.el()`, `ctx.group()`, and `ctx.must()`
3. Use `defineScenario` for browser automation with `runtime.goto()` and `runtime.snapshot()`
4. Prefer semantic constraints (`centered`, `alignedHorizontally`) over pixel values
5. Use ranges (`between`, `approx`) for flexibility
6. Handle responsive design with `ctx.viewportClass` or `rt.viewportClass`
7. Always wait for page stability before taking snapshots
8. Use stable selectors (`data-testid`, IDs) over fragile CSS classes

