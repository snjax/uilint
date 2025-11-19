## uilint Cheatsheet for Frontend AI Agents

This document is for **AI frontend agents** that need to design or refactor UI **blindly** and rely on **uilint** to catch layout and visual issues.

It explains:

- **What uilint is** and how to wire it into a project (folders, scripts, commands, component testing).
- **How to refer to DOM objects** (selectors) and the full set of **relations / helpers** you can use.
- **How to write strong layout specs** that describe a “good” UI as precisely as possible.
- **How to combine uilint with Playwright actions** (scrolling, clicking, opening modals).
- **How to do multi-viewport checks** (mobile → 4K).
- **What the violation format looks like** and how to interpret it.

All examples use **TypeScript** and imports from `@uilint/core` and `@uilint/playwright`.

---

## 1. What uilint is and how to add it to a project

### 1.1. Mental model

- **uilint** is a **layout linter on top of Playwright**:
  - Playwright opens a page and **collects DOM snapshots** (geometry, visibility, text).
  - `@uilint/core` evaluates a set of **synchronous constraints** (the layout spec) over those snapshots.
  - You get a **structured report** with **violations** describing misaligned, overflowing, or missing elements.

- Key runtime concepts:
  - **ElemSnapshot** – raw captured data: frames (`box`, `view`, `canvas`), visibility, text.
  - **Elem / Group** – runtime wrappers (`Elem` is a single element, `Group` is an array of `Elem`).
  - **Range** – numeric predicate `(value: number) => boolean`, used for distances, widths, counts, etc.
  - **Constraint** – object with `name` and `check(): Violation[]`.
  - **Violation** – `{ constraint, message, details? }`.
  - **LayoutSpec** – compiled spec: named elements, groups and constraint factories.
  - **LayoutReport** – `{ specName, viewTag?, viewSize, violations }`.

### 1.2. Minimal folder and script layout

When you add uilint to a project, a good minimal structure is:

- **Specs**
  - `uilint/specs/*.ts` – one spec per important **page** or **component-harness**.
- **Playwright**
  - Either:
    - Playwright tests under `playwright/tests/*.spec.ts` that use `toMatchLayout`, or
    - A standalone CLI script like `scripts/run-layout.cjs` that calls `runLayoutSpec`.
- **Scripts in `package.json`**
  - Example:

```json
{
  "scripts": {
    "layout:login": "node scripts/run-layout.cjs --spec=login",
    "layout:dashboard": "node scripts/run-layout.cjs --spec=dashboard",
    "layout:crm": "node scripts/run-layout.cjs --spec=crm",
    "layout:check": "node scripts/run-layout.cjs"
  }
}
```

### 1.3. Installing and wiring uilint (outside this monorepo)

For an arbitrary project (React, Svelte, etc.):

- **Dependencies**
  - `@uilint/core` – layout DSL and runtime.
  - `@uilint/playwright` – Playwright integration and matchers.

```bash
pnpm add -D @uilint/core @uilint/playwright @playwright/test
pnpm exec playwright install
```

- **Create a specs folder**
  - `uilint/specs/loginLayoutSpec.ts`
  - `uilint/specs/dashboardLayoutSpec.ts`
  - `uilint/specs/crmLayoutSpec.ts`

- **Add a Playwright config** (if not already present) and a test file that uses `toMatchLayout`:

```ts
// playwright/setup-uilint.ts
import { expect } from '@playwright/test';
import { installUilintMatchers } from '@uilint/playwright';

installUilintMatchers(expect);
```

```ts
// playwright/tests/login-layout.spec.ts
import { test, expect } from '@playwright/test';
import { loginLayoutSpec } from '../uilint/specs/loginLayoutSpec';

test('login layout is valid', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/login');

  await expect(page).toMatchLayout(loginLayoutSpec, {
    viewTag: 'desktop-login',
    testInfo,
  });
});
```

### 1.4. CLI script and stdout JSON output

For **CI** and for **LLM agents**, prefer a **CLI linter** instead of only test-based usage.
Pattern (see `examples/uilint-crm-demo/scripts/run-layout.cjs`):

- **Registry of specs**
  - Keys: `login`, `dashboard`, `crm`, ...
  - Each key maps to:
    - `module`: path to spec file (TypeScript).
    - `exportName`: named export.
    - `page`: HTML entry, e.g. `index.html`, `dashboard.html`, `crm.html`.
    - `viewTag`: prefix for reports (e.g. `cli-login`).
    - Optional `setup(page, viewportConfig)`: open modal, expand panels, etc.

- **Viewport presets**
  - Names → `{ width, height }`:
    - `mobile`, `tablet`, `macbook-air`, `macbook-pro`, `wide`, `ultra-wide`, `screen-4k`.

- **Arguments**
  - `--spec=login|dashboard|crm|all`.
  - `--page=NAME_OR_HTML` – override default page.
  - `--viewport=WIDTHxHEIGHT` – ad-hoc viewport.
  - `--viewports=name1,name2,...` – subset of presets.
  - `--skip-build` – reuse existing `dist/`.
  - `--format=json|compact` – pretty or one-line JSON.
  - `--workers=N` – run specs × viewports in parallel.

- **Execution loop**
  - Build app (unless `--skip-build`).
  - Serve `dist/` with a tiny HTTP server.
  - For each (spec × viewport):
    - Run `runLayoutSpec(page, spec, { viewTag })`.
    - Print a `LayoutReport` as JSON **to stdout**.
    - Track whether any report has violations → affects exit code.

Example call:

```bash
pnpm layout:check -- --format=compact --viewports=mobile,tablet,macbook-air
```

Output is one `LayoutReport` JSON per line, ideal for agents to parse.

### 1.5. Component testing patterns

There are two complementary layers:

- **Behavioral component tests (no browser sockets)**
  - Use `Vitest` + `jsdom` + `@testing-library/*` to assert component logic and DOM structure.
  - These tests do **not** use uilint and run without Playwright.

- **Layout “component” tests with uilint**
  - Create a **small harness page** that renders a single component in isolation, e.g.:
    - `src/harness/AddressForm.html` or a route `/harness/address-form`.
  - Write a spec `uilint/specs/addressFormLayoutSpec.ts` targeting that page.
  - Add an entry in the CLI spec registry (`address-form: { page: 'harness/address-form.html', ... }`).
  - Now running `layout:check` covers:
    - Full pages (**CRM**, dashboard), and
    - Individual component harnesses with the same uilint DSL.

This way, logic is tested with fast unit tests, and precise layout is validated via uilint on small, focused Playwright pages.

---

## 2. Elements, groups, geometry and relations (full cheatsheet)

### 2.1. Selecting objects (elements and groups)

Build-time context `LayoutCtx`:

- **Elements and groups**
  - `ctx.el(selector: SelectorInput): ElemRef` – single logical element.
  - `ctx.group(selector: SelectorInput): GroupRef` – zero or more elements.
- **Special elements**
  - `ctx.view: ElemRef` – the **visible view frame** (viewport).
  - `ctx.canvas: ElemRef` – the **full scrollable canvas** (whole page).

`SelectorInput` can be:

- Plain **CSS string**:
  - `ctx.el('#app-header')`
  - `ctx.group('.card')`
  - `ctx.group('nav > a')`
- Explicit descriptor:
  - `ctx.el({ type: 'css', selector: '#header' })`
  - `ctx.group({ type: 'xpath', selector: '//ul[@id="menu"]/li' })`

Runtime context `RuntimeCtx` (inside `ctx.mustRef`):

- `rt.el(ref: ElemRef): Elem`
- `rt.group(ref: GroupRef): Group`
- `rt.view: Elem` – runtime view frame.
- `rt.canvas: Elem` – runtime full canvas.

### 2.2. Frames and geometry (`box`, `view`, `canvas`)

Each `Elem` has three frames, stored as **absolute rects** (`left`, `top`, `width`, `height`) relative to the root `box`:

- **`elem.box`**
  - Intrinsic geometry of the element itself.
  - Not clipped by parents or scroll.
  - All shorthand props use this frame:
    - `left`, `top`, `right`, `bottom`, `width`, `height`, `centerX`, `centerY`.

- **`elem.view`**
  - Geometry clipped by the currently visible **view**.
  - For the top-level document, `rt.view` describes the viewport size.

- **`elem.canvas`**
  - Scrollable canvas associated with the element.
  - For the document:
    - `rt.canvas` (and its `box`) describe the **full scrollable page**.

To switch frames explicitly:

```ts
const boxRect = elem.getRect('box');
const viewRect = elem.getRect('view');
const canvasRect = elem.getRect('canvas');
```

Use this when you want to express relations **in view space** or **in canvas space** explicitly.

### 2.3. Range helpers

All numeric relations accept a `Range`, and you build those with helpers:

- **Basic ranges**
  - `eq(v)` – `value === v`.
  - `gt(v)` / `gte(v)` – strictly / inclusively greater than `v`.
  - `lt(v)` / `lte(v)` – strictly / inclusively less than `v`.
  - `between(min, max)` – `min <= value <= max`.
  - `approx(expected, tolerance)` – `|value - expected| <= tolerance` (absolute tolerance).
  - `approxRelative(expected, tolerance)` – relative tolerance:
    - `|value - expected| <= tolerance * max(|value|, |expected|)`.
  - `anyRange` – always `true` (when you must provide a range but do not care).

Use `approxRelative` for **percentage-based** comparisons (e.g. font size, widths relative to a baseline).

### 2.4. Primitive positional relations

All live in `@uilint/core` and operate on **runtime** `Elem`/`Group`:

- **Vertical ordering**
  - `below(a, b, range)` – `a` is **below** `b` with vertical gap in `range`.
    - Uses `diff = a.top - b.bottom`.
  - `above(a, b, range)` – `a` is **above** `b` with vertical gap in `range`.
    - Uses `diff = b.top - a.bottom`.

- **Horizontal ordering**
  - `leftOf(a, b, range)` – `a` is to the **left** of `b`, gap in `range`.
    - Uses `diff = b.left - a.right`.
  - `rightOf(a, b, range)` – `a` is to the **right** of `b`, gap in `range`.
    - Uses `diff = a.left - b.right`.

- **Proximity (“near”)**
  - `near(a, b, { left?, right?, top?, bottom? })`
    - You can specify **one or more directions**.
    - For each provided direction:
      - Computes the corresponding gap (non-negative).
      - Fails immediately if elements **overlap** in that direction.
      - Then checks the gap against the provided `Range`.
    - Example:
      - `near(field, button, { right: between(8, 16), bottom: between(4, 12) })`
        - “Button is near the right and bottom edges of the field, not overlapping.”

- **Containment (`inside`)**
  - `inside(inner, outer, { top?, right?, bottom?, left? })`
    - If you **omit edges**, uilint defaults to **strict containment**:
      - All four edges must have `gap >= 0`.
      - Example: `inside(card, container)` ensures card does not bleed outside container.
    - If you **specify edges**, only those are checked:
      - `inside(card, container, { left: between(16, 32), right: between(16, 32) })`
      - `inside(hero, view, { top: between(0, 40) })`
    - You can use **negative ranges** to allow intentional bleed.

- **Dimensions**
  - `widthIn(e, range)` – width within `range`.
  - `heightIn(e, range)` – height within `range`.
  - `widthMatches(elem, ref, { tolerance?, ratio? })`
    - With `tolerance`: relative tolerance of widths.
    - With `ratio`: enforce `elem.width / ref.width` in a `Range` (e.g. `between(0.95, 1)`).
  - `heightMatches(elem, ref, { tolerance?, ratio? })` – same for heights.
  - `ratio(a, b, expected, tolerance)` – generic ratio constraint.

### 2.5. Alignment and spacing

- **Center-based alignment**
  - `alignedHorizontally(group, tolerance)` – all elements share similar `centerY` (same visual row).
  - `alignedVertically(group, tolerance)` – all elements share similar `centerX` (same visual column).
  - `centered(a, b, { h?, v? })`:
    - `h`: check `a.centerX - b.centerX` within a `Range`.
    - `v`: check `a.centerY - b.centerY` within a `Range`.

- **Edge-based alignment (strict)**
  - `alignedHorizontallyTop(group, tolerance)` – align by **top** edges only.
  - `alignedHorizontallyBottom(group, tolerance)` – align by **bottom** edges only.
  - `alignedHorizontallyEdges(group, tolerance)` – enforce equal **top and bottom** (same height and vertical position).
  - `alignedVerticallyLeft(group, tolerance)` – align by **left** edges.
  - `alignedVerticallyRight(group, tolerance)` – align by **right** edges.
  - `alignedVerticallyEdges(group, tolerance)` – equal **left and right** (same width and horizontal position).

- **Equal gutters**
  - `alignedHorizEqualGap(items, gapTolerance)`:
    - Assumes items are in a horizontal row.
    - Sorts by `left`, compares gaps between neighbors.
    - Ensures all horizontal gaps are close to the first one.
  - `alignedVertEqualGap(items, gapTolerance)`:
    - Same idea for vertically stacked items (sort by `top`, compare vertical gaps).

- **Corner / edge pinning**
  - `on(element, container, { horizontal?, vertical? })`:
    - `horizontal`: `{ elementEdge: 'left' | 'right', referenceEdge: 'left' | 'right', range }`.
    - `vertical`: `{ elementEdge: 'top' | 'bottom', referenceEdge: 'top' | 'bottom', range }`.
    - Example: badge on card corner:

```ts
on(badge, card, {
  horizontal: { elementEdge: 'right', referenceEdge: 'right', range: between(-8, 0) },
  vertical: { elementEdge: 'top', referenceEdge: 'top', range: between(-4, 4) },
});
```

### 2.6. Visibility, presence, text

- **Visibility / presence**
  - `visible(e, expectVisible)` – `e.visible === expectVisible`.
  - `present(e, expectPresent)` – DOM presence flag.

- **Text**
  - `textEquals(e, expected)` – exact match.
  - `textMatches(e, pattern)` – `pattern` is `RegExp` or string (converted to `RegExp`).
  - `textDoesNotOverflow(e)` – checks that rendered text does not overflow or get clipped by scroll.
  - `textLinesAtMost(e, maxLines)` – uses `textMetrics` to enforce line count.
  - `singleLineText(e)` – ensures a single line with no overflow; ideal for buttons, chips, small labels.

### 2.7. Group combinators and utilities

- **Quantifiers**
  - `forAll(group, e => ...)` – every element must satisfy the factory.
  - `exists(group, e => ...)` – at least one must satisfy.
  - `none(group, e => ...)` – no elements are allowed to satisfy.
  - `countIs(group, range)` – constraints on `group.length`.
  - `amountOfVisible(group, range)` – constraints on visible elements count.

- **Plain array utilities**
  - `pairwise<T>(arr: T[]): [T, T][]` – adjacent pairs, useful for custom gap checks.
  - `windowed<T>(arr: T[], size: number): T[][]` – sliding windows.

### 2.8. Extras (grids, rows, tables)

- `almostSquared(e, tolerance = 0.1)` – aspect ratio ~ 1; good for avatars, icons, thumbnails.
- `alignedHorizEqualGap(items, gapTolerance)` – consistent horizontal gutters.
- `alignedVertEqualGap(items, gapTolerance)` – consistent vertical gutters.
- `tableLayout(items, { columns, verticalMargin?, horizontalMargin? })` – grid / table layout:
  - Groups by rows using `top` with tolerance.
  - Enforces column count, vertical and horizontal margins.
- `sidesHorizontallyInside(items, container, marginRange?)`:
  - Enforces left/right margins, no overlaps, and consistent heights for a row of items (menu, pill row, etc.).

---

## 3. How to write strong uilint specs

The goal of a spec is to describe **what a good layout means**, not just “no errors”.
The more constraints you specify, the more likely you are to catch subtle regressions:

- Mis-centered cards.
- Headers or footers drifting out of view.
- Inputs and labels breaking alignment.
- Content that silently overflows or disappears into scroll.

### 3.1. Spec structure template

Typical pattern for a page spec (e.g. `crmLayoutSpec`):

1. **Declare key elements and groups**
   - Shell: header, navigation, main content, sidebar, footer.
   - Content: cards, tables, forms, filters, buttons.
   - Infrastructure: modals, overlays, sticky panels, alerts.

2. **Basic presence & visibility**
   - Ensure important elements are present and visible:

```ts
ctx.must(
  present(header, true),
  visible(header, true),
  present(footer, true),
);
```

3. **Scaffold layout**
   - Ensure header at top, footer at bottom (in canvas), main areas do not overlap:

```ts
ctx.mustRef(rt => {
  const headerEl = rt.el(header);
  const footerEl = rt.el(footer);
  const mainEl = rt.el(main);

  return [
    inside(headerEl, rt.view, { top: between(0, 40) }),
    inside(footerEl, rt.canvas, { bottom: eq(0) }),
    below(mainEl, headerEl, between(16, 80)),
    above(mainEl, footerEl, between(16, 160)),
  ];
});
```

4. **No unwanted overflow or overlaps**
   - Use `inside` and `near` to keep elements inside view/canvas and avoid overlapping:

```ts
ctx.mustRef(rt => {
  const cards = rt.group(cardGroup);
  const content = rt.el(contentArea);

  return [
    inside(content, rt.view), // main content never bleeds out of viewport
    forAll(cards, card => inside(card, content)), // all cards inside content
  ];
});
```

5. **Forms & labels**
   - Ensure labels are near inputs, align columns, and avoid deformation:

```ts
ctx.mustRef(rt => {
  const rows = rt.group(formRows);

  return forAll(rows, row => {
    const label = row.findChild?.('label');
    const input = row.findChild?.('input');
    if (!label || !input) return [];

    return [
      alignedHorizontallyTop([label, input], 2),
      near(label, input, { right: between(4, 24) }),
      singleLineText(label),
    ];
  });
});
```

6. **Responsiveness**
   - Use `rt.view.width` to branch constraints by viewport:

```ts
ctx.mustRef(rt => {
  const width = rt.view.width;
  const sidebarEl = rt.el(sidebar);
  const contentEl = rt.el(content);

  if (width < 768) {
    // mobile: sidebar stacks above content
    return [
      above(sidebarEl, contentEl, between(0, 40)),
      alignedVertically([sidebarEl, contentEl], 16),
    ];
  }

  // desktop: sidebar on the left, same row
  return [
    leftOf(sidebarEl, contentEl, between(16, 80)),
    alignedHorizontally([sidebarEl, contentEl], 16),
  ];
});
```

7. **Presence vs scroll**
   - Ensure critical objects **are in view when needed**, not scrolled away:
     - Use `inside(elem, rt.view, { top: gte(0), bottom: gte(0) })`.
     - Avoid specs that only check canvas-level existence if visibility matters at the current step.

### 3.2. Checklist for a “good” layout

When creating or updating a spec, try to cover:

- **Shell**
  - Header pinned and fully inside view.
  - Footer attached to canvas bottom (`inside(footer, rt.canvas, { bottom: eq(0) })`).
  - Navigation visible and aligned.

- **Scroll behavior**
  - Only the main content area scrolls; headers/footers stay within bounds.
  - No important controls end up off-screen after typical interactions.

- **Alignment & spacing**
  - Rows: `alignedHorizontally` / `alignedHorizontallyTop/Bottom/Edges` + `alignedHorizEqualGap`.
  - Columns: `alignedVertically` / `alignedVerticallyLeft/Right/Edges` + `alignedVertEqualGap`.
  - Proximity: `near` with appropriate ranges.

- **Forms**
  - Labels and inputs aligned by top or center.
  - No overlapping or cut-off labels.
  - Buttons and primary CTAs visible and reachable.

- **Text**
  - Long titles / descriptions do not overflow (`textDoesNotOverflow`).
  - Taglines or labels stay within 1–2 lines (`singleLineText` / `textLinesAtMost`).

The more of these you encode, the more reliably uilint will catch visual regressions.

---

## 4. Combining uilint with Playwright actions

You can use uilint **before and after interactions** within the same Playwright test.

### 4.1. Simple interaction example

```ts
import { test, expect } from '@playwright/test';
import { installUilintMatchers } from '@uilint/playwright';
import { dashboardLayoutSpec } from '../uilint/specs/dashboardLayoutSpec';

installUilintMatchers(expect);

test('dashboard layout around modal interactions', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dashboard');

  // Baseline layout
  await expect(page).toMatchLayout(dashboardLayoutSpec, {
    viewTag: 'desktop-before-modal',
    testInfo,
  });

  // Interaction: open modal
  await page.getByRole('button', { name: /Open Insights/i }).click();

  // Layout with modal open
  await expect(page).toMatchLayout(dashboardLayoutSpec, {
    viewTag: 'desktop-after-modal',
    testInfo,
  });
});
```

### 4.2. Scroll scenarios

For scroll-sensitive layouts (sticky headers, infinite lists):

- Use `page.mouse.wheel`, `page.keyboard.press('End')` or `locator.scrollIntoViewIfNeeded()` between layout checks.
- In specs:
  - Use `rt.view` to describe what must be visible **right now**.
  - Use `rt.canvas` when constraining overall page geometry.

Example idea:

- Scroll a long table.
- Ensure header row stays pinned near top:

```ts
ctx.mustRef(rt => {
  const headerRow = rt.el(tableHeader);
  return inside(headerRow, rt.view, { top: between(0, 8) });
});
```

### 4.3. Using CLI for scripted flows

For pure CLI flows (no Playwright test files), embed actions in `setup(page, viewportConfig)` function in the spec registry:

- Open menus, expand details, navigate to sub-tabs.
- Then run a single `runLayoutSpec` call per (spec × viewport).

This approach is implemented in the `uilint-crm-demo` script:

- `dashboard` spec’s registry entry has a `setup` function that tries to open a modal before running the layout check.

---

## 5. Multi-viewport testing (mobile → 4K)

uilint is designed to run the **same spec across multiple viewports**, so you can keep logic in one place and test:

- Mobile phones.
- Tablets.
- Laptops.
- Ultra-wide and 4K screens.

### 5.1. Viewport presets in CLI

In the sample CLI (`run-layout.cjs`), there is a `VIEWPORT_PRESETS` map:

- `mobile`: `{ width: 390, height: 844 }`
- `tablet`: `{ width: 834, height: 1112 }`
- `macbook-air`: `{ width: 1280, height: 832 }`
- `macbook-pro`: `{ width: 1440, height: 900 }`
- `wide`: `{ width: 1600, height: 900 }`
- `ultra-wide`: `{ width: 1920, height: 1080 }`
- `screen-4k`: `{ width: 2560, height: 1440 }`

The default sequence:

- `mobile`, `tablet`, `macbook-air`, `macbook-pro`, `wide`, `ultra-wide`, `screen-4k`.

### 5.2. Agent usage patterns

- To run all specs on all presets:

```bash
node scripts/run-layout.cjs --spec=all
```

- To restrict to some viewports:

```bash
node scripts/run-layout.cjs --spec=crm --viewports=mobile,tablet,macbook-air
```

- To use an ad-hoc viewport:

```bash
node scripts/run-layout.cjs --spec=dashboard --viewport=1024x768
```

Each (spec × viewport) produces a separate `LayoutReport` in stdout.

### 5.3. Writing responsive-friendly specs

Inside specs:

- Always branch logic by `rt.view.width` for major breakpoints.
- Keep constraints tolerant enough to handle small differences across devices.
- Use `viewTag` to encode viewport in reports (`cli-crm-mobile`, `cli-crm-screen-4k`, etc.).

Example:

```ts
ctx.mustRef(rt => {
  const width = rt.view.width;
  const cards = rt.group(summaryCards);

  if (width < 768) {
    // One column
    return [
      alignedVertically(cards, 8),
      alignedVertEqualGap(cards, 8),
    ];
  }

  // Multi-column grid
  return [
    tableLayout(cards, { columns: 3 }),
  ];
});
```

---

## 6. Violations and layout reports

### 6.1. Violation structure

At the core, every failing constraint yields a **Violation**:

```ts
export interface Violation {
  readonly constraint: string;
  readonly message: string;
  readonly details?: unknown;
}
```

- **constraint** – hierarchical name:
  - e.g. `"crmLayoutSpec.forms.personalInfo.sameRow[0]"`.
  - Good practice: prefix with section names when you write custom helpers.
- **message** – human-readable description of what went wrong:
  - e.g. `"Submit button is not aligned with input fields"`.
- **details** – arbitrary JSON payload:
  - Distances, actual vs expected values, element names, etc.

### 6.2. LayoutReport structure

`runLayoutSpec` (via `@uilint/playwright`) returns:

```ts
export interface LayoutReport {
  readonly specName: string;
  readonly viewTag?: string;
  readonly viewSize: { width: number; height: number };
  readonly violations: Violation[];
}
```

- **specName** – the spec’s name (from `defineLayoutSpec`).
- **viewTag** – optional label for the run (e.g. `"cli-login-mobile"`).
- **viewSize** – actual viewport dimensions used.
- **violations** – array of violations; empty when layout passes.

### 6.3. Example JSON report

Example of a single report (pretty-printed):

```json
{
  "specName": "CRM dashboard layout",
  "viewTag": "cli-dashboard-macbook-air",
  "viewSize": { "width": 1280, "height": 832 },
  "violations": [
    {
      "constraint": "crm.dashboard.filtersPanel.inside.left",
      "message": "filtersPanel left edge is not inside dashboard content",
      "details": { "value": -4 }
    },
    {
      "constraint": "crm.cards.equalGap[2]",
      "message": "Gap differs from baseline",
      "details": {
        "gap": 40,
        "baseline": 24,
        "tolerance": 4
      }
    }
  ]
}
```

When writing agents that consume uilint:

- Treat **any non-empty `violations` array as failure**.
- Use `constraint` + `details` to:
  - Localize the issue (which section).
  - Decide how to change CSS / markup.
- Keep your own **high-level summary** if needed, but always retain the raw JSON for debugging.

---

This cheatsheet covers:

- How to **wire uilint** into a project (specs, Playwright, CLI, component harnesses).
- How to **select elements and express relations** between them (geometry, text, groups).
- How to **write rich specs** that describe good layouts and catch subtle glitches.
- How to **combine with actions and multi-viewport** testing.
- How to **interpret violations** and use them to guide further UI changes.

As an AI agent, follow these patterns whenever you are asked to add, adjust, or debug layout constraints with uilint.*** End Patch】|()
