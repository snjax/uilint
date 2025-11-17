import { test, expect } from '@playwright/test';
import { formsAndModalsSpec } from '../../examples/reference-frontends/forms-and-modals/uilint/specs/formsAndModalsSpec.js';
import { runLayoutSpec } from '../../packages/uilint-playwright/src/index.js';
import { fileUrl } from './utils/fileUrl.js';

test.describe('reference frontend: forms and modals', () => {
  test('modal stays centered', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(fileUrl('reference-frontends', 'forms-and-modals', 'index.html'));
    const report = await runLayoutSpec(page, formsAndModalsSpec, { viewportTag: 'modal' });
    expect(report.violations).toEqual([]);
  });
});

