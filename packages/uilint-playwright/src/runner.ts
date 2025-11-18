import type { Page } from '@playwright/test';
import {
  evaluateLayoutSpecOnSnapshots,
  type ElemSnapshot,
  type FrameRect,
  type LayoutReport,
  type LayoutRunOptions,
  type LayoutSpec,
  type SnapshotEvaluationOptions,
} from '@uilint/core';
import { collectSnapshots } from './snapshots.js';

function createVirtualSnapshot(
  selector: string,
  box: FrameRect,
  view: FrameRect,
  canvas: FrameRect,
): ElemSnapshot {
  return {
    selector,
    box,
    view,
    canvas,
    visible: true,
    present: true,
    text: '',
  };
}

async function getDocumentFrames(page: Page): Promise<{ view: FrameRect; canvas: FrameRect }> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollX = window.scrollX ?? doc.scrollLeft ?? body?.scrollLeft ?? 0;
    const scrollY = window.scrollY ?? doc.scrollTop ?? body?.scrollTop ?? 0;
    const viewWidth = window.innerWidth ?? doc.clientWidth ?? body?.clientWidth ?? 0;
    const viewHeight = window.innerHeight ?? doc.clientHeight ?? body?.clientHeight ?? 0;
    const docWidth = Math.max(
      doc.scrollWidth,
      body?.scrollWidth ?? 0,
      doc.offsetWidth,
      body?.offsetWidth ?? 0,
      viewWidth,
    );
    const docHeight = Math.max(
      doc.scrollHeight,
      body?.scrollHeight ?? 0,
      doc.offsetHeight,
      body?.offsetHeight ?? 0,
      viewHeight,
    );

    const view = {
      left: scrollX,
      top: scrollY,
      width: viewWidth,
      height: viewHeight,
    };

    const canvas = {
      left: 0,
      top: 0,
      width: docWidth,
      height: docHeight,
    };

    return { view, canvas };
  });
}

/**
 * @notice Snapshot + evaluate a layout spec against a live Playwright page.
 * @param page Current Playwright `Page`.
 * @param spec Layout specification defined via `@uilint/core`.
 * @param options Optional view tag metadata.
 */
export async function runLayoutSpec(
  page: Page,
  spec: LayoutSpec,
  options: LayoutRunOptions = {},
): Promise<LayoutReport> {
  const [store, docFrames] = await Promise.all([
    collectSnapshots(page, spec),
    getDocumentFrames(page),
  ]);

  const viewSnapshot = createVirtualSnapshot('view', docFrames.view, docFrames.view, docFrames.view);
  const canvasSnapshot = createVirtualSnapshot('canvas', docFrames.canvas, docFrames.view, docFrames.canvas);

  return evaluateLayoutSpecOnSnapshots(spec, store, {
    view: viewSnapshot,
    canvas: canvasSnapshot,
    viewTag: options.viewTag,
  } satisfies SnapshotEvaluationOptions);
}

