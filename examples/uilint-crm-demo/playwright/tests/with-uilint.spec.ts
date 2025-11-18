import { expect, test } from '@playwright/test';
import { installUilintMatchers } from '@uilint/playwright';
import { loginLayoutSpec } from '../../uilint/specs/loginLayoutSpec.js';
import { dashboardLayoutSpec } from '../../uilint/specs/dashboardLayoutSpec.js';
import { crmLayoutSpec } from '../../uilint/specs/crmLayoutSpec.js';

installUilintMatchers(expect);

test.describe('uilint CRM demo', () => {
  test('login layout stays consistent', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await expect(page).toMatchLayout(loginLayoutSpec, {
      viewTag: 'desktop-login',
      testInfo,
    });
  });

  test('dashboard layout stays consistent after opening modal', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/dashboard.html');
    await page.getByRole('button', { name: 'Open insights' }).click();
    await expect(page).toMatchLayout(dashboardLayoutSpec, {
      viewTag: 'desktop-dashboard',
      testInfo,
    });
  });

  test('CRM command center layout holds key constraints', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto('/crm.html');
    await expect(page).toMatchLayout(crmLayoutSpec, {
      viewTag: 'crm-desktop',
      testInfo,
    });
  });
});

