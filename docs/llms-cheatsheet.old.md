# AGENTS: Using uilint as a UI layout linter with Playwright

This document is written for **AI agents** working in this repository or integrating **uilint** into other projects.
It explains:

- How to think about uilint (snapshot-based, constraint DSL).
- How to structure **layout specs** and **linting scripts** around Playwright.
- A **cheatsheet** of available relations and combinators.
- How to define **custom relations**.

All examples are in **TypeScript** and assume imports from `@uilint/core` and `@uilint/playwright`.

---

## 1. Mental model for uilint

uilint is a **layout linter**:

- It takes **DOM snapshots** (positions, sizes, visibility, text) from the browser.
- It evaluates a set of **synchronous constraints** (the layout spec) against those snapshots.
- It returns a **structured report** with violations.

Key entities:

- **ElemSnapshot** – raw data captured from the DOM.
- **Elem / Group** – runtime wrappers over snapshots (single element / array of elements).
- **Range** – predicate over numbers `(value: number) => boolean`.
- **Constraint** – object with `name` and `check(): Violation[]`.
- **Violation** – `{ constraint, message, details? }`.
- **LayoutSpec** – compiled spec (elements, groups, constraint factories).
- **LayoutReport** – `{ scenarioName, snapshotName, viewTag?, viewSize, viewportClass, violations }`.

Specs are defined in **build-time DSL** and later run against real pages via **Playwright**.

---

## 2. Minimal agent prompt for uilint + Playwright

When you are an agent asked to work with uilint in a project, follow this protocol:

1. **Locate layout specs and scripts**
   - Look for `uilint/specs/*.ts` with `defineLayoutSpec(...)`.
   - Look for Playwright test files importing from `@uilint/playwright`.
   - Look for CLI scripts like `scripts/run-layout.cjs` that call `runLayoutSpec`.

2. **Read the spec API**
   - Import from `@uilint/core`:
     - `defineLayoutSpec`, `LayoutCtx`, `RuntimeCtx`, `LayoutSpec`.
     - Geometry primitives: `below`, `above`, `leftOf`, `rightOf`, `inside`, `widthIn`, `heightIn`, `centered`, `alignedHorizontally`, `alignedVertically`, `ratio`.
    - Visibility/content primitives: `visible`, `present`, `textEquals`, `textMatches`, `textDoesNotOverflow`, `textLinesAtMost`, `singleLineText`.
     - Group combinators: `forAll`, `exists`, `none`, `countIs`, `amountOfVisible`.
     - Extras for grids and rows: `almostSquared`, `alignedHorizEqualGap`, `tableLayout`, `sidesHorizontallyInside`.
     - Range helpers: `eq`, `gt`, `gte`, `lt`, `lte`, `between`, `approx`, `anyRange`.

3. **Define or adjust specs**
   - Use `ctx.el(selector)` and `ctx.group(selector)` to declare **elements** and **groups**.
   - Use `ctx.must(...)` for simple one-off constraints.
   - Use `ctx.must(rt => { ... })` when constraints depend on **view width** or must branch by runtime logic.

4. **Connect specs to Playwright**
   - For tests: use `@uilint/playwright`:
     - `runLayoutSpec(page, spec, { viewTag })` for manual checks.
     - Or install matchers and use `await expect(page).toMatchLayout(spec, { viewTag, testInfo })`.
   - For CLI linting: call `runLayoutSpec` inside a Node script that:
     - Builds the app (if needed).
     - Serves built assets via a static HTTP server.
     - Launches headless Playwright, runs the spec for selected viewports, and prints `LayoutReport` in JSON.

5. **Keep output machine-readable**
   - Always return **structured JSON** when building CLI linting scripts.
   - Make sure the process exits with:
     - `0` when there are **no violations**.
     - non‑zero when **any violation** is present.

---

## 3. Basic spec structure (for agents)

Typical spec file (e.g. `uilint/specs/loginLayoutSpec.ts`):

```ts
import {
  defineLayoutSpec,
  below,
  inside,
  centered,
  alignedHorizontally,
  widthIn,
  between,
  eq,
  visible,
} from '@uilint/core';

export const loginLayoutSpec = defineLayoutSpec('example-login', ctx => {
  // 1. Declare elements/groups by selectors
  const header = ctx.el('#header');
  const menu = ctx.el('#main-nav');
  const hero = ctx.el('#hero-panel');
  const footer = ctx.el('footer');
  const navItems = ctx.group('#main-nav a');

  // 2. Simple constraints that don’t depend on the current view
  ctx.must(
    visible(header, true),
    below(menu, header, between(0, 32)),
    below(hero, menu, between(24, 120)),
    inside(footer, ctx.view, { left: eq(0), right: eq(0), bottom: eq(0) }),
  );

  // 3. Constraints that depend on runtime (view size, counts, etc.)
  ctx.must(rt => {
    const heroElem = rt.el(hero);
    const nav = rt.group(navItems);
    const heroWidth = rt.viewportClass === 'desktop' ? between(360, 680) : between(320, 520);

    return [
      centered(heroElem, rt.view, { h: between(-40, 40) }),
      alignedHorizontally(nav, 8),
      widthIn(heroElem, heroWidth),
    ];
  });
});
```

Key points for agents:

- Always give **stable selectors** (`id`, `data-testid`, robust CSS/XPath).
- Use `ctx.view` and `ctx.canvas` when constraints are relative to the visible frame or full scrollable canvas.
- Use `ctx.must` with a factory function when logic must branch by viewport class or other runtime values.

---

## 4. Elements and groups (selectors & XPath)

Build-time context `LayoutCtx` exposes:

- `ctx.el(selector: SelectorInput): ElemRef`
- `ctx.group(selector: SelectorInput): GroupRef`
- `ctx.view: ElemRef` (virtual element representing the current view frame).
- `ctx.canvas: ElemRef` (virtual element representing the full scrollable canvas).

`SelectorInput`:

- **CSS string**:
  - `ctx.el('#header')`
  - `ctx.group('.card')`
  - `ctx.group('ul#menu > li')`
- **Explicit selector descriptor**:
  - `ctx.el({ type: 'css', selector: '#header' })`
  - `ctx.group({ type: 'xpath', selector: '//ul[@id="menu"]/li' })`

Runtime context `RuntimeCtx` (used inside `ctx.must` factory) exposes:

- `rt.el(ref: ElemRef): Elem`
- `rt.group(ref: GroupRef): Group`
- `rt.view: Elem`
- `rt.canvas: Elem`

Every runtime element exposes three frames:

- `elem.box` – intrinsic geometry of the element.
- `elem.view` – clipped geometry after intersecting with view frames.
- `elem.canvas` – scrollable canvas owned by the element.

Use `elem.getRect('canvas')` (or `'view'`) when you need primitives to operate against a different frame; the default getters (`left`, `top`, `width`, ...) use the box frame. For the top-level document element specifically, `rt.view` represents the current viewport while `rt.canvas` (and therefore `rt.canvas.getRect('canvas')`) represents the full scrollable page; there is no need to drill into `.box` to get the correct dimensions.

Use this pattern:

```ts
ctx.must(rt => {
  const cards = rt.group(cardGroup);
  const view = rt.view;
  // use primitives/combinators against runtime values
  ...
});
```

---

## 5. Playwright integration patterns

### 5.1. In-test matcher (`toMatchLayout`)

For Playwright Test, install matchers once and use them inside specs.

Example setup (usually in `playwright/test` entry or a test helper):

```ts
// playwright/setup-uilint.ts
import { expect } from '@playwright/test';
import { installUilintMatchers } from '@uilint/playwright';

installUilintMatchers(expect);
```

Playwright test using `toMatchLayout`:

```ts
import { test, expect } from '@playwright/test';
import { loginLayoutSpec } from '../uilint/specs/loginLayoutSpec';

test.describe('uilint CRM demo', () => {
  test('login layout stays consistent', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    await expect(page).toMatchLayout(loginLayoutSpec, {
      viewTag: 'desktop-login',
      testInfo, // allows attachments
    });
  });
});
```

### 5.2. Direct `runLayoutSpec` usage

If you do not want custom matchers, call `runLayoutSpec` directly:

```ts
import { test } from '@playwright/test';
import { runLayoutSpec } from '@uilint/playwright';
import { loginLayoutSpec } from '../uilint/specs/loginLayoutSpec';

test('login layout passes uilint', async ({ page }) => {
  await page.goto('/');
  const report = await runLayoutSpec(page, loginLayoutSpec, {
    viewTag: 'ci-desktop-login',
  });

  if (report.violations.length) {
    throw new Error(`Layout spec failed: ${JSON.stringify(report, null, 2)}`);
  }
});
```

### 5.3. CLI lint script pattern

For CI and LLM agents, prefer a **post-render CLI** that:

1. Builds the app.
2. Serves `dist/` with a simple HTTP server.
3. Launches Playwright and calls `runLayoutSpec`.
4. Prints one JSON `LayoutReport` per (page × view preset).

Typical layout script structure (see `examples/uilint-crm-demo/scripts/run-layout.cjs`):

- **Registry of specs**:
  - Map spec keys to:
    - `module`: path to spec file (TypeScript).
    - `exportName`: named export.
    - `page`: HTML entry (e.g. `index.html`, `dashboard.html`).
    - `viewTag`: prefix used in reports.
    - Optional `setup(page, viewportConfig)`: function that prepares UI state (e.g. opens a modal).
- **Viewport presets**:
  - Define names → `{ width, height }` objects:
    - `mobile`, `tablet`, `macbook-air`, `macbook-pro`, `wide`, `ultra-wide`, `screen-4k`.
- **Argument parsing**:
  - `--spec` – one spec key or `"all"`.
  - `--page` – override page path (optional).
  - `--viewport=WIDTHxHEIGHT` – ad-hoc viewport.
  - `--viewports=name1,name2,...` – subset of presets.
  - `--skip-build` – reuse existing `dist/`.
  - `--format=json|compact` – pretty or one-line JSON.
- **Execution loop**:
  - For each selected spec key:
    - For each viewport:
      - Run `runLayoutSpec`.
      - Print JSON report.
      - Track whether **any** report has violations → exit code.

This pattern is suitable for **multi-agent orchestration**: agents only need to call the script with the right flags and parse JSON from stdout.

---

## 6. Cheatsheet: ranges and basic relations

### 6.1. Ranges (`Range`)

Ranges are numeric predicates used by almost every relation:

- `eq(v)` – `value === v`.
- `gt(v)` / `gte(v)` – strictly / inclusively greater than `v`.
- `lt(v)` / `lte(v)` – strictly / inclusively less than `v`.
- `between(min, max)` – `min <= value <= max`.
- `approx(expected, tolerance)` – `|value - expected| <= tolerance`.
- `anyRange` – always `true` (useful when a boundary is required but you don't care).

### 6.2. Primitive positional relations

All primitives live in `@uilint/core` and accept **runtime elements** (`Elem`) and ranges:

- **Vertical ordering**
  - `below(a, b, range)` – `a` is below `b` by a vertical gap within `range`
    - Uses `diff = a.top - b.bottom`.
  - `above(a, b, range)` – `a` is above `b` by a vertical gap within `range`
    - Uses `diff = b.top - a.bottom`.

- **Horizontal ordering**
  - `leftOf(a, b, range)` – `a` is to the **left** of `b`, gap within `range`
    - Uses `diff = b.left - a.right`.
  - `rightOf(a, b, range)` – `a` is to the **right** of `b`, gap within `range`
    - Uses `diff = a.left - b.right`.
  - `near(a, b, { right: between(8, 16), bottom: between(4, 12) })` – combine left/right/top/bottom gaps; overlap automatically fails.

- **Containment**
  - `inside(inner, outer, { top?, right?, bottom?, left? })`
    - Without explicit edges, defaults to “fully inside” (`>= 0` on all sides).
    - Provide negative/positive ranges when you intentionally allow overflow or padding.
    - Examples:
      - `inside(viewportHero, view)` – hero never bleeds beyond the viewport.
      - `inside(card, container, { left: between(16, 32), right: between(16, 32) })` – horizontal padding.

- **Dimensions**
  - `widthIn(e, range)` / `heightIn(e, range)` – absolute dimension limits.
  - `widthMatches(elem, ref, { ratio: between(0.95, 1) })` – compare to another element via ratio ranges or `{ tolerance: 0.02 }` for relative tolerance.
  - `approxRelative(expected, tolerance)` – Range helper when you need to reuse the “relative difference <= tolerance” formula.
  - `ratio(a, b, expected, tolerance)` – generic ratio; used by higher-level helpers (e.g. `almostSquared`).

### 6.3. Alignment relations (rows / columns / centers)

- `alignedHorizontally(group, tolerance)` – all elements share **similar `centerY`** (same row).
- `alignedVertically(group, tolerance)` – all elements share **similar `centerX`** (same column).
- `centered(a, b, { h?, v? })`:
  - `h`: horizontal center difference `a.centerX - b.centerX` within `Range`.
  - `v`: vertical center difference `a.centerY - b.centerY` within `Range`.

Use these for:

- Navigation menus, button rows, icon rows → `alignedHorizontally(...)`.
- Multi-column forms, stacked cards → `alignedVertically(...)`.
- Centering hero panels / modals inside view → `centered(hero, view, { h: approx(0, 16), v: between(-40, 40) })`.
- Need edge-based alignment? Use `alignedHorizontallyTop/Bottom/Edges` and `alignedVerticallyLeft/Right/Edges`.
- Need equal gutters? Use `alignedHorizEqualGap` and `alignedVertEqualGap`.
- Want a badge “on” a corner? Combine `on(badge, card, { horizontal: { elementEdge: 'right', referenceEdge: 'left', range: eq(8) }, vertical: { elementEdge: 'bottom', referenceEdge: 'top', range: between(4, 8) } })` with `centered` if you still need center alignment.

### 6.4. Visibility, presence, text

- `visible(e, expectVisible)` – `e.visible` matches expectation.
- `present(e, expectPresent)` – `e.present` matches expectation (DOM presence).
- `textEquals(e, expected)` – exact text comparison.
- `textMatches(e, pattern)` – `pattern` is `RegExp` or string (converted to `RegExp`).
- `textDoesNotOverflow(e)` – compares scroll bounds + rendered text rect to make sure content stays inside the element without being clipped.
- `textLinesAtMost(e, maxLines)` – Playwright populates `textMetrics` (line rectangles), so this enforces the rendered line count directly.
- `singleLineText(e)` – combines the two checks above; perfect for button labels, chips, form inputs that must stay on one line.

Use these to ensure:

- Modals/backdrops appear / disappear in expected states.
- Buttons/labels have stable labels.
- Skeletons/spinners are present/absent depending on scenario.
- Text labels never bleed outside their containers or wrap past the allowed number of lines.

---

## 7. Cheatsheet: group combinators & grid-like relations

### 7.1. Group quantifiers

All accept `Group` (array of `Elem`) and/or factories.

- `forAll(group, e => ...)`
  - Applies factory to every element; aggregates violations.
  - Use when *every* element must satisfy a set of constraints.

- `exists(group, e => ...)`
  - Passes if **at least one** element satisfies the factory (i.e. yields no violations).
  - Fails with a single violation if none match.

- `none(group, e => ...)`
  - Inverse of `exists`: fails if **any** element satisfies the factory.

- `countIs(group, range)`
  - `range` over `group.length`.
  - For example: `countIs(cards, between(3, 4))`.

- `amountOfVisible(group, range)`
  - Counts `elem.visible === true`.
  - For example: `amountOfVisible(steps, eq(3))`.

### 7.2. Utilities on plain arrays

These are **generic** (not limited to UI elements) but are useful when you need to iterate pairwise or windowed:

- `pairwise<T>(arr: T[]): [T, T][]`
  - Returns adjacent pairs `[arr[i], arr[i+1]]`.
  - Use for neighbor gap checks, step-by-step comparisons.

- `windowed<T>(arr: T[], size: number): T[][]`
  - Returns sliding windows of length `size`.
  - Use for patterns like “every 3 consecutive cards must follow some rule”.

### 7.3. Higher-level layout helpers (rows, grids, side margins)

All live in the "extras" layer and are re-exported from `@uilint/core`.

- `almostSquared(e, tolerance = 0.1)`
  - Aspect ratio ~ 1 (square-ish icons / thumbnails).

- `alignedHorizEqualGap(items, gapTolerance, name?)`
  - Assumes items are in one horizontal row.
  - Sorts by `left`, measures gaps between neighbors.
  - Ensures each gap is close to the first gap within `gapTolerance`.
- `alignedVertEqualGap(items, gapTolerance, name?)`
  - Same as above but for stacked columns (sorts by `top`, compares vertical gutters).

- `tableLayout(items, { columns, verticalMargin?, horizontalMargin? })`
  - Auto-groups items into rows by `top` coordinate with a row tolerance.
  - Ensures:
    - Each row has **at most** `columns` elements.
    - Optional horizontal gaps between neighbors are within `horizontalMargin` range.
    - Optional vertical gaps between rows are within `verticalMargin` range.
  - Use for **grids**, **card collections**, **tables**.

- `sidesHorizontallyInside(items, container, marginRange?, name?)`
  - Sorts items left→right, then:
    - Checks left margin from container left.
    - Checks right margin from container right.
    - Ensures items do not overlap.
    - Ensures neighbor items share similar `top` and `height`.
  - Use for **tiers**, **pill rows**, **navigation bars** that should align with container edges.

These helpers already encode common “same row” / “same column” invariants.

---

## 8. Adding custom relations (for agents)

You can define new relations in project code and reuse them across specs.

### 8.1. Simple custom relation (same row within tolerance)

Goal: define `sameRow(a, b, tolerance)` that checks whether two elements are roughly on the same horizontal row.

```ts
import type { Constraint, Elem } from '@uilint/core';
import { approx, between, defineLayoutSpec } from '@uilint/core';

// Example: custom helper using existing primitives
export function sameRow(a: Elem, b: Elem, tolerance: number): Constraint {
  // "Same row" → their top coordinates are close, and vertical overlap is non-negative.
  // We can reuse center-based logic via `centered` or roll our own checks in a spec factory.
  // Here we show a "within range" spec-level approach:
  return {
    name: `sameRow(${a.name},${b.name})`,
    check: () => {
      const violations = [];
      const topDiff = Math.abs(a.top - b.top);
      const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

      if (!approx(0, tolerance)(topDiff)) {
        violations.push({
          constraint: 'sameRow.top',
          message: `${a.name} and ${b.name} are not aligned on the same row`,
          details: { topDiff, tolerance },
        });
      }

      if (!between(0, Number.POSITIVE_INFINITY)(overlap)) {
        violations.push({
          constraint: 'sameRow.overlap',
          message: `${a.name} and ${b.name} do not overlap vertically`,
          details: { overlap },
        });
      }

      return violations;
    },
  };
}
```

Usage inside a spec:

```ts
ctx.must(rt => {
  const a = rt.el(cardA);
  const b = rt.el(cardB);
  return sameRow(a, b, 4);
});
```

### 8.2. Custom relation using the same pattern as core

Core helpers are implemented via a common pattern:

- Name your constraint.
- Capture a few numeric measurements.
- Pass them through `Range` functions or custom comparisons.
- Return an array of `Violation` objects when checks fail.

When adding custom relations:

- Keep them **pure and synchronous** (no DOM/Playwright calls).
- Avoid reading global state; rely only on arguments (`Elem`, numbers, ranges).
- Make constraint names descriptive (`'grid.sameRow[0]'`, `'section.headerPadding'`).

### 8.3. Organising custom relations in a project

For larger projects:

- Create a module like `uilint/custom-relations.ts` that exports:
  - Project-specific helpers: `sameRow`, `sameColumn`, `stickyHeader`, `balancedColumns`, etc.
  - Pre-baked compositions of primitives and extras.
- Import these helpers inside spec files instead of re-implementing logic.

This keeps specs **declarative** and easy to maintain by both humans and agents.

---

## 9. Recommended scripting structure for projects (summary)

When an agent needs to add uilint to a project, follow this structure:

1. **Specs folder**
   - `uilint/specs/*.ts` with `defineLayoutSpec` for each key screen or component.
2. **Playwright tests**
   - Use `@uilint/playwright`:
     - Either via `runLayoutSpec` directly.
     - Or via the `toMatchLayout` matcher.
3. **CLI lint script**
   - `scripts/run-layout.cjs` (or `.ts` compiled to Node):
     - Spec registry (name → spec module + page).
     - Viewport presets.
     - Argument parsing.
     - Static server for `dist/`.
     - Loop calling `runLayoutSpec` and printing JSON.
4. **package.json scripts**
   - Example:
     - `"layout:login": "node scripts/run-layout.cjs --spec=login"`
     - `"layout:dashboard": "node scripts/run-layout.cjs --spec=dashboard"`
     - `"layout:crm": "node scripts/run-layout.cjs --spec=crm"`
     - `"layout:check": "node scripts/run-layout.cjs"` (all specs × multiple viewports).

With this setup, AI agents can:

- Modify or add layout specs.
- Extend the lint script with new pages or viewports.
- Run `pnpm layout:...` commands and interpret JSON reports to guide further edits.


