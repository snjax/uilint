# Advanced: Playwright Integration

While the CLI workflow (`uilint layout`) is the recommended way to use `uilint`, you can also integrate it directly into your existing Playwright tests. This is useful if you want to check layout during complex user flows or functional tests.

## Installation

```bash
npm install -D @uilint/playwright
```

## Setup

In your `playwright.config.ts` or test setup file, install the matchers:

```ts
import { expect } from '@playwright/test';
import { installUilintMatchers } from '@uilint/playwright';

installUilintMatchers(expect);
```

## API Reference

### `expect(page).toMatchLayout(spec, options?)`

Asserts that the current page state satisfies the given layout spec.

**Arguments:**
-   `spec`: A `LayoutSpec` object defined via `defineLayoutSpec`.
-   `options`: (Optional) Configuration object.
    -   `viewTag`: A string tag (e.g., 'mobile', 'dark-mode') to pass to the spec context.
    -   `testInfo`: The Playwright `TestInfo` object. If provided, the full JSON report will be attached to the test result on failure.

**Example:**
```ts
test('login page layout', async ({ page }, testInfo) => {
  await page.goto('/login');
  
  // Basic usage
  await expect(page).toMatchLayout(loginSpec);
  
  // With options
  await expect(page).toMatchLayout(loginSpec, { 
    testInfo,
    viewTag: 'mobile' 
  });
});
```

### `runLayoutSpec(page, spec, options?)`

The core function that runs the layout check. Use this if you need programmatic access to the violations without throwing an error immediately.

**Returns:** `Promise<LayoutReport>`

**Example:**
```ts
import { runLayoutSpec } from '@uilint/playwright';

test('manual check', async ({ page }) => {
  const report = await runLayoutSpec(page, mySpec);
  
  if (report.violations.length > 0) {
    console.log(`Found ${report.violations.length} violations`);
    // Custom handling...
  }
});
```

### `assertLayout(page, spec, options?)`

A helper that runs `runLayoutSpec` and throws an error with a formatted message if there are violations. Similar to the matcher but can be used outside of `expect`.

## How It Works

When you run a layout check, `@uilint/playwright`:
1.  **Collects Snapshots**: It runs a script in the browser to capture the bounding boxes, visibility, and text of all elements defined in your spec. This is optimized to minimize round-trips (O(1) round-trip per check).
2.  **Evaluates Constraints**: The snapshots are passed to the `@uilint/core` engine, which verifies all constraints.
3.  **Reports**: Any violations are returned as a structured report.

## Debugging

If a layout test fails, `toMatchLayout` provides a summary of the first 5 violations.

**Full Report:**
If you pass `testInfo` to the matcher options, `uilint` will attach the full JSON report to your Playwright test results. You can download this JSON from the Playwright HTML report to see exactly which constraints failed and the actual values measured.

```ts
await expect(page).toMatchLayout(spec, { testInfo });
```

## Best Practices

-   **Use the Matcher**: For most cases, `expect(page).toMatchLayout(...)` is the best approach as it integrates with Playwright's reporting and retries.
-   **Wait for State**: Just like standard Playwright assertions, ensure the page is in the desired state (animations finished, data loaded) before checking layout. `toMatchLayout` does *not* auto-retry or wait for layout stability; it snapshots the current state immediately.
    ```ts
    await page.waitForSelector('.content-loaded');
    await expect(page).toMatchLayout(spec);
    ```
