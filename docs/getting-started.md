## Getting started

This guide shows how to install uilint, write a minimal layout spec, and run it from a Playwright test.

### Installation

Assuming a Node.js + Playwright project:

```bash
pnpm add -D @uilint/core @uilint/playwright @playwright/test
```

You should already have Playwright browsers installed:

```bash
pnpm exec playwright install
```

### Minimal layout spec

Create a spec file, for example `uilint/specs/loginLayout.ts`:

```ts
import {
  alignedHorizontally,
  below,
  between,
  defineLayoutSpec,
  eq,
  inside,
} from '@uilint/core';

export const loginLayoutSpec = defineLayoutSpec('Login page', ctx => {
  const header = ctx.el('#app-header');
  const menu = ctx.el('#primary-nav');
  const content = ctx.el('#content');
  const footer = ctx.el('#app-footer');
  const menuItems = ctx.group('#primary-nav .nav-item');

  ctx.must(
    inside(header, ctx.view, {
      left: eq(0),
      right: eq(0),
      top: between(0, 20),
    }),
    below(menu, header, between(0, 16)),
    below(content, menu, between(16, 64)),
    alignedHorizontally(menuItems, 4),
  );
});
```

### Using `runLayoutSpec` in a Playwright test

In a Playwright Test suite:

```ts
// tests/login-layout.spec.ts
import { test, expect } from '@playwright/test';
import { runLayoutSpec } from '@uilint/playwright';
import { loginLayoutSpec } from '../uilint/specs/loginLayout';

test('login layout is valid', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/login');

  const report = await runLayoutSpec(page, loginLayoutSpec, {
    viewTag: 'desktop',
  });

  if (report.violations.length > 0) {
    await testInfo.attach('login-layout-report', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });
  }

  expect(report.violations).toEqual([]);
});
```

### Using the `toMatchLayout` matcher

For a more idiomatic Playwright experience, use the matcher from `@uilint/playwright`:

```ts
// tests/setup-uilint.ts
import { expect } from '@playwright/test';
import { installUilintMatchers } from '@uilint/playwright';

installUilintMatchers(expect);
```

```ts
// tests/login-layout.spec.ts
import { test, expect } from '@playwright/test';
import { loginLayoutSpec } from '../uilint/specs/loginLayout';

test('login layout is valid', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/login');

  await expect(page).toMatchLayout(loginLayoutSpec, {
    viewTag: 'desktop',
    testInfo,
  });
});
```

### Running specs with the CLI

For regression suites that should cover multiple pages and viewports without writing Playwright tests, use the `@uilint/cli` package. It discovers `uilint.config.ts` (or `.js`) in your project root, serves `dist/`, and executes every configured **scenario** (a Playwright script that can take multiple layout snapshots) across the selected viewports:

```bash
pnpm add -D @uilint/cli
npx uilint layout --viewports mobile,desktop --scenario crm-happy-path
```

The CLI ships with an extensive preset list (phones, tablets, laptops, 4K) and supports groups (`mobile`, `tablet`, `desktop`) as well as ad-hoc entries such as `modal=1200x720`. See `docs/cli.md` for the full configuration, scenario API, and option reference.

When the config lives outside of your current working directory (for example, inside `examples/uilint-crm-demo` in this repo), point the CLI to it explicitly or wire it into a package script:

```json
{
  "scripts": {
    "lint:layout": "pnpm exec uilint layout --config ./uilint.config.ts"
  }
}
```

Running `pnpm run lint:layout` now behaves like any other linter step and prints the layout reports to stdout.

### Next steps

- Explore the reference frontends under `examples/reference-frontends` to see more advanced specs.
- Check the API references (`api-core.md`, `api-playwright.md`) for details on each primitive and helper.


