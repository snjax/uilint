import { expect, test } from '@playwright/test';
import { amountOfVisible, defineLayoutSpec, eq, visible } from '@uilint/core';
import { installUilintMatchers } from '../../packages/uilint-playwright/src/index.js';

installUilintMatchers(expect);

const spec = defineLayoutSpec('matcher spec', ctx => {
  const header = ctx.el('#header');
  const cards = ctx.group('.card');

  ctx.mustRef(rt => [
    visible(rt.el(header), true),
    amountOfVisible(rt.group(cards), eq(2)),
  ]);
});

const baseHtml = `
  <header id="header">Title</header>
  <div class="card">A</div>
  <div class="card">B</div>
`;

test.describe('uilint-playwright matcher', () => {
  test('passes for matching layout', async ({ page }) => {
    await page.setContent(baseHtml);
    await expect(page).toMatchLayout(spec, { viewportTag: 'match' });
  });

  test('fails for mismatching layout and attaches report', async ({ page }, testInfo) => {
    await page.setContent(baseHtml.replace('<div class="card">B</div>', ''));

    let error: Error | null = null;
    try {
      await expect(page).toMatchLayout(spec, { viewportTag: 'mismatch', testInfo });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();

    const attachmentNames = testInfo.attachments.map(att => att.name);
    expect(attachmentNames.some(name => name.startsWith('uilint-layout-report'))).toBe(true);
  });
});

