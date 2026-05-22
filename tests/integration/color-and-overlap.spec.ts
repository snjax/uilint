import { test, expect } from '@playwright/test';
import {
  colorDistance,
  defineLayoutSpec,
  gte,
  MIN_TEXT_BG_DISTANCE,
  noOverlap,
} from '@uilint/core';
import { runLayoutSpec } from '../../packages/uilint-playwright/src/index.js';

const html = `
  <style>
    body { margin: 0; }
    #banner { height: 60px; background: #1a1a1a; color: #ffffff; }
    #faint { height: 40px; background: #888888; color: #7c7c7c; }
    .stage { position: relative; height: 200px; }
    .box { position: absolute; width: 80px; height: 80px; background: #cccccc; }
    #b1 { left: 0; top: 0; }
    #b2 { left: 100px; top: 0; }
    #b3 { left: 40px; top: 40px; }
  </style>
  <div id="banner">Banner</div>
  <div id="faint">Faint</div>
  <div class="stage">
    <div class="box" id="b1"></div>
    <div class="box" id="b2"></div>
    <div class="box" id="b3"></div>
  </div>
`;

test.describe('color capture and overlap (browser)', () => {
  // Exercises the snapshot collector end to end: if computed color/backgroundColor
  // were not captured, colorDistance would emit a missing-data violation.
  test('colorDistance passes for high text/background contrast', async ({ page }) => {
    await page.setContent(html);
    const spec = defineLayoutSpec((ctx) => {
      const banner = ctx.el('#banner', 'banner');
      ctx.must(colorDistance(banner, banner, gte(MIN_TEXT_BG_DISTANCE)));
    });
    const report = await runLayoutSpec(page, spec, { scenarioName: 'color', snapshotName: 'contrast' });
    expect(report.violations).toEqual([]);
  });

  test('colorDistance flags low text/background contrast', async ({ page }) => {
    await page.setContent(html);
    const spec = defineLayoutSpec((ctx) => {
      const faint = ctx.el('#faint', 'faint');
      ctx.must(colorDistance(faint, faint, gte(MIN_TEXT_BG_DISTANCE)));
    });
    const report = await runLayoutSpec(page, spec, { scenarioName: 'color', snapshotName: 'faint' });
    expect(report.violations.length).toBe(1);
  });

  test('noOverlap passes for disjoint boxes and fails for overlapping ones', async ({ page }) => {
    await page.setContent(html);

    const okSpec = defineLayoutSpec((ctx) => {
      ctx.must(noOverlap(ctx.group('#b1, #b2', 'row')));
    });
    const okReport = await runLayoutSpec(page, okSpec, { scenarioName: 'overlap', snapshotName: 'ok' });
    expect(okReport.violations).toEqual([]);

    const badSpec = defineLayoutSpec((ctx) => {
      ctx.must(noOverlap(ctx.group('.box', 'boxes')));
    });
    const badReport = await runLayoutSpec(page, badSpec, { scenarioName: 'overlap', snapshotName: 'bad' });
    expect(badReport.violations.length).toBeGreaterThan(0);
  });
});
