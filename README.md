# uilint

uilint is a layout linter for Playwright. It lets you describe layout and visual invariants in TypeScript, then assert them inside your existing Playwright tests using an ergonomic matcher.

## Documentation

- Overview: `docs/overview.md`
- Getting started: `docs/getting-started.md`
- Galen comparison: `docs/galen-comparison.md`
- Core API reference: `docs/api-core.md`
- Playwright adapter API reference: `docs/api-playwright.md`

For a deeper dive into the motivation and architecture, see `PRD.md` and the development plan under `development-plan/`.

## Quick example

Define a layout spec:

```ts
// uilint/specs/loginLayout.ts
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

  ctx.mustRef(rt => [
    inside(rt.el(header), rt.view, {
      left: eq(0),
      right: eq(0),
      top: between(0, 20),
    }),
    below(rt.el(menu), rt.el(header), between(0, 16)),
    below(rt.el(content), rt.el(menu), between(16, 64)),
    alignedHorizontally(rt.group(menuItems), 4),
  ]);
});
```

Use it in a Playwright test:

```ts
// tests/login-layout.spec.ts
import { test, expect } from '@playwright/test';
import { installUilintMatchers } from '@uilint/playwright';
import { loginLayoutSpec } from '../uilint/specs/loginLayout';

installUilintMatchers(expect);

test('login layout is valid', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/login');

  await expect(page).toMatchLayout(loginLayoutSpec, {
    viewTag: 'desktop',
    testInfo,
  });
});
```

## Building and testing

From the repository root:

```bash
pnpm install
pnpm exec playwright install   # first time only

pnpm lint
pnpm build
pnpm test
```

See `examples/reference-frontends/` and `examples/uilint-crm-demo/` for runnable demos and integration tests.