import type { Page } from '@playwright/test';
import {
  evaluateLayoutSpecOnSnapshots,
  type ElemSnapshot,
  type LayoutReport,
  type LayoutRunOptions,
  type LayoutSpec,
  type SnapshotEvaluationOptions,
} from '@uilint/core';
import { collectSnapshots } from './snapshots.js';

/**
 * @notice Creates a synthetic snapshot for virtual elements (viewport/screen).
 * @param selector Symbolic selector name (`"viewport"` or `"screen"`).
 * @param size Box size (width/height in CSS pixels).
 * @returns Snapshot usable as `viewport` or `screen` in the core runtime.
 */
function createBoxSnapshot(selector: string, size: { width: number; height: number }): ElemSnapshot {
  return {
    selector,
    left: 0,
    top: 0,
    right: size.width,
    bottom: size.height,
    width: size.width,
    height: size.height,
    visible: true,
    present: true,
    text: '',
  };
}

/**
 * @notice Returns the current viewport size, falling back to `window.inner*`.
 * @param page Current Playwright `Page`.
 * @returns Effective viewport dimensions in pixels.
 */
async function getViewportDimensions(page: Page): Promise<{ width: number; height: number }> {
  const viewport = page.viewportSize();
  if (viewport) {
    return viewport;
  }
  return page.evaluate(() => ({
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  }));
}

/**
 * @notice Returns the scrollable document size (aka "screen" in PRD terms).
 * @param page Current Playwright `Page`.
 * @returns Scrollable document dimensions in pixels.
 */
async function getScreenDimensions(page: Page): Promise<{ width: number; height: number }> {
  return page.evaluate(() => ({
    width: Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth || 0,
      window.innerWidth,
    ),
    height: Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight || 0,
      window.innerHeight,
    ),
  }));
}

/**
 * @notice Snapshot + evaluate a layout spec against a live Playwright page.
 * @param page Current Playwright `Page`.
 * @param spec Layout specification defined via `@uilint/core`.
 * @param options Optional viewport tag metadata.
 */
export async function runLayoutSpec(
  page: Page,
  spec: LayoutSpec,
  options: LayoutRunOptions = {},
): Promise<LayoutReport> {
  const [store, viewportSize, screenSize] = await Promise.all([
    collectSnapshots(page, spec),
    getViewportDimensions(page),
    getScreenDimensions(page),
  ]);

  const viewportSnapshot = createBoxSnapshot('viewport', viewportSize);
  const screenSnapshot = createBoxSnapshot('screen', screenSize);

  return evaluateLayoutSpecOnSnapshots(spec, store, {
    viewport: viewportSnapshot,
    screen: screenSnapshot,
    viewportTag: options.viewportTag,
  } satisfies SnapshotEvaluationOptions);
}

