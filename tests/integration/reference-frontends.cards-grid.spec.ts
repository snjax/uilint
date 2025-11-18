import { expect, test } from '@playwright/test';
import { cardsGridSpec } from '../../examples/reference-frontends/cards-grid/uilint/specs/cardsGridSpec.js';
import { runLayoutSpec } from '../../packages/uilint-playwright/src/index.js';
import { fileUrl } from './utils/fileUrl.js';

const baseFile = fileUrl('reference-frontends', 'cards-grid', 'index.html');

test.describe('reference frontend: cards grid', () => {
  test('ideal layout passes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(baseFile);
    const report = await runLayoutSpec(page, cardsGridSpec, { viewTag: 'desktop' });
    expect(report.violations).toEqual([]);
  });

  test('broken variant reports violations', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${baseFile}?variant=broken`);
    const report = await runLayoutSpec(page, cardsGridSpec, { viewTag: 'broken' });
    expect(report.violations.length).toBeGreaterThan(0);
  });
});

