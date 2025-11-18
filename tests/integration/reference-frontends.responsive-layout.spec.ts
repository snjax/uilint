import { test, expect } from '@playwright/test';
import {
  responsiveDesktopSpec,
  responsiveMobileSpec,
} from '../../examples/reference-frontends/responsive-layout/uilint/specs/responsiveLayoutSpecs.js';
import { runLayoutSpec } from '../../packages/uilint-playwright/src/index.js';
import { fileUrl } from './utils/fileUrl.js';

const responsiveFile = fileUrl('reference-frontends', 'responsive-layout', 'index.html');

test.describe('reference frontend: responsive layout', () => {
  test('desktop layout keeps sidebar on the left', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(responsiveFile);
    const report = await runLayoutSpec(page, responsiveDesktopSpec, { viewTag: 'desktop' });
    expect(report.violations).toEqual([]);
  });

  test('mobile layout stacks sidebar above content', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.goto(responsiveFile);
    const report = await runLayoutSpec(page, responsiveMobileSpec, { viewTag: 'mobile' });
    expect(report.violations).toEqual([]);
  });
});

