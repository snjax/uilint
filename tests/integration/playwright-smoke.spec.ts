import { expect, test } from '@playwright/test';

test('loads a minimal HTML page', async ({ page }) => {
  await page.goto('data:text/html,<title>uilint smoke</title><h1 id="root">ready</h1>');
  await expect(page.locator('#root')).toHaveText('ready');
});

