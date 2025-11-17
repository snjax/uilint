import { expect, test } from '@playwright/test';
import { installUilintMatchers } from '../../../../packages/uilint-playwright/src/index.js';
import { loginLayoutSpec } from '../../uilint/specs/loginLayoutSpec.js';
import { dashboardLayoutSpec } from '../../uilint/specs/dashboardLayoutSpec.js';
import { fileUrl } from './utils/fileUrl.js';

installUilintMatchers(expect);

test.describe('with-uilint example', () => {
  test('login layout stays consistent', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(fileUrl('index.html'));
    await expect(page).toMatchLayout(loginLayoutSpec, {
      viewportTag: 'desktop',
      testInfo,
    });
  });

  test('dashboard layout stays consistent after opening modal', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(fileUrl('dashboard.html'));
    await page.getByRole('button', { name: 'Open insights' }).click();
    await expect(page).toMatchLayout(dashboardLayoutSpec, {
      viewportTag: 'desktop',
      testInfo,
    });
  });
});

