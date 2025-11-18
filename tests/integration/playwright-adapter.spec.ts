import { test, expect } from '@playwright/test';
import { amountOfVisible, countIs, defineLayoutSpec, eq, visible } from '@uilint/core';
import { runLayoutSpec } from '../../packages/uilint-playwright/src/index.js';

const html = `
  <style>
    #header { height: 60px; background: #222; color: #fff; display: flex; align-items: center; padding: 0 16px; }
    .grid { display: flex; gap: 16px; margin-top: 24px; }
    .card { width: 120px; height: 80px; background: #eee; display: flex; align-items: center; justify-content: center; }
  </style>
  <header id="header">Dashboard</header>
  <section class="grid">
    <div class="card">One</div>
    <div class="card">Two</div>
  </section>
`;

const spec = defineLayoutSpec('adapter spec', ctx => {
  const header = ctx.el('#header');
  const cards = ctx.group('.card');

  ctx.mustRef(rt => [
    visible(rt.el(header), true),
    amountOfVisible(rt.group(cards), eq(2)),
    countIs(rt.group(cards), eq(2)),
  ]);
});

test.describe('uilint-playwright runLayoutSpec', () => {
  test('returns empty violations for matching layout', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await page.setContent(html);

    const report = await runLayoutSpec(page, spec, { viewTag: 'smoke' });
    expect(report.specName).toBe('adapter spec');
    expect(report.viewSize).toEqual({ width: 800, height: 600 });
    expect(report.viewTag).toBe('smoke');
    expect(report.violations).toEqual([]);
  });

  test('reports violations when layout expectations fail', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await page.setContent(html.replace('<div class="card">Two</div>', ''));

    const report = await runLayoutSpec(page, spec, { viewTag: 'broken' });
    expect(report.violations.length).toBeGreaterThan(0);
  });
});

