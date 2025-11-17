import { test, expect } from '@playwright/test';
import { navigationMenuSpec } from '../../examples/reference-frontends/navigation-menu/uilint/specs/navigationMenuSpec.js';
import { runLayoutSpec } from '../../packages/uilint-playwright/src/index.js';
import { fileUrl } from './utils/fileUrl.js';

test.describe('reference frontend: navigation menu', () => {
  test('layout remains valid on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto(fileUrl('reference-frontends', 'navigation-menu', 'index.html'));

    const report = await runLayoutSpec(page, navigationMenuSpec, { viewportTag: 'desktop' });
    expect(report.violations).toEqual([]);
  });
});

