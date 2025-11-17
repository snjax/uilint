## @uilint/playwright API reference

This document summarizes the main public APIs of the `@uilint/playwright` package.

### Core functions

#### `runLayoutSpec`

```ts
import type { Page } from '@playwright/test';
import type { LayoutReport, LayoutRunOptions, LayoutSpec } from '@uilint/core';

export async function runLayoutSpec(
  page: Page,
  spec: LayoutSpec,
  options?: LayoutRunOptions,
): Promise<LayoutReport>;
```

Responsibilities:

- Inspects the `LayoutSpec` to discover required elements and groups.
- Collects snapshots from the browser via `page.locator(...)`.
- Builds viewport and screen snapshots from the current page.
- Delegates to `evaluateLayoutSpecOnSnapshots` in `@uilint/core`.
- Returns a `LayoutReport` with:
  - `specName`,
  - `viewportTag` (from options),
  - `viewportSize`,
  - `violations`.

Use this when you want full control over assertion and reporting logic.

#### `collectSnapshots`

```ts
import type { Page } from '@playwright/test';
import type { LayoutSpec, SnapshotStore } from '@uilint/core';

export async function collectSnapshots(page: Page, spec: LayoutSpec): Promise<SnapshotStore>;
```

Collects `ElemSnapshot[]` arrays for each element/group referenced in the spec. This is primarily an internal building block but can be used if you want to plug the snapshot store into a custom runtime.

### Matchers and helpers

`@uilint/playwright` exposes a Playwright Test matcher and utilities built on top of `runLayoutSpec`.

#### `toMatchLayout` matcher

Signature (conceptual):

```ts
import type { Page, TestInfo } from '@playwright/test';
import type { LayoutSpec, LayoutRunOptions } from '@uilint/core';

export interface MatcherRunOptions extends LayoutRunOptions {
  testInfo?: TestInfo;
}

export async function toMatchLayout(
  this: unknown,
  page: Page,
  spec: LayoutSpec,
  options?: MatcherRunOptions,
): Promise<{ pass: boolean; message: () => string }>;
```

Behavior:

- Calls `runLayoutSpec(page, spec, options)` under the hood.
- **Passes** when `report.violations.length === 0`.
- On failure:
  - attaches a JSON `LayoutReport` to the test (if `testInfo` is provided),
  - returns a message summarizing the number and a subset of violations.

You normally do not call `toMatchLayout` directly; instead you register it via `installUilintMatchers`.

#### `installUilintMatchers`

```ts
import { expect } from '@playwright/test';
import { installUilintMatchers } from '@uilint/playwright';

installUilintMatchers(expect);
```

After calling this, you can use the matcher directly:

```ts
await expect(page).toMatchLayout(spec, { viewportTag: 'desktop', testInfo });
```

#### `uilintMatchers`

```ts
export const uilintMatchers: {
  toMatchLayout: typeof toMatchLayout;
};
```

The raw matcher object, suitable for custom `expect.extend` scenarios.

#### `assertLayout`

```ts
export async function assertLayout(
  page: Page,
  spec: LayoutSpec,
  options?: MatcherRunOptions,
): Promise<LayoutReport>;
```

Convenience helper that:

- runs `runLayoutSpec`,
- throws an `Error` if there are any violations (with a formatted summary),
- returns the `LayoutReport` on success.

Useful when you want to assert on the report in code without using the matcher.

### Typical integration patterns

#### Inline usage in a Playwright test

```ts
import { test, expect } from '@playwright/test';
import { installUilintMatchers } from '@uilint/playwright';
import { dashboardLayoutSpec } from './uilint/specs/dashboardLayoutSpec';

installUilintMatchers(expect);

test('dashboard layout after interactions', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dashboard');

  await page.getByRole('button', { name: 'Open Insights' }).click();

  await expect(page).toMatchLayout(dashboardLayoutSpec, {
    viewportTag: 'desktop',
    testInfo,
  });
});
```

#### Using `runLayoutSpec` directly

```ts
import { test, expect } from '@playwright/test';
import { runLayoutSpec } from '@uilint/playwright';
import { cardsGridSpec } from './uilint/specs/cardsGridSpec';

test('cards grid layout is valid', async ({ page }, testInfo) => {
  await page.goto('/cards');

  const report = await runLayoutSpec(page, cardsGridSpec, { viewportTag: 'desktop' });

  if (report.violations.length) {
    await testInfo.attach('cards-layout-report', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });
  }

  expect(report.violations).toEqual([]);
});
```

### Exposed types

For convenience, `@uilint/playwright` re-exports several core types:

```ts
export type {
  LayoutSpec,
  LayoutRunOptions,
  LayoutReport,
  SnapshotStore,
  ElemSnapshot,
} from '@uilint/core';

export type { MatcherRunOptions } from './matchers.js';
```

This means you can typically import everything you need for layout specs and Playwright integration from just `@uilint/core` and `@uilint/playwright`.


