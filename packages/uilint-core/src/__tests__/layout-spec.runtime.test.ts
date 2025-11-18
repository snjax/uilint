import { describe, expect, it } from 'vitest';
import { amountOfVisible, defineLayoutSpec, evaluateLayoutSpecOnSnapshots, countIs, eq } from '../index.js';
import type { ElemRef, GroupRef, LayoutReport, LayoutSpec, SnapshotStore } from '../index.js';
import { makeSnapshot } from './testUtils.js';

function runSpecWithSnapshots(spec: LayoutSpec, snapshots: SnapshotStore): LayoutReport {
  const view = makeSnapshot({ selector: 'view', width: 1280, height: 720 });
  const canvas = makeSnapshot({ selector: 'canvas', width: 1280, height: 2000 });
  return evaluateLayoutSpecOnSnapshots(spec, snapshots, {
    view,
    canvas,
    viewTag: 'desktop',
  });
}

describe('Layout spec runtime evaluation', () => {
  it('creates runtime elements and reports success', () => {
    let headerRef!: ElemRef;
    let cardsRef!: GroupRef;
    const spec = defineLayoutSpec('cards grid', ctx => {
      headerRef = ctx.el('#header');
      cardsRef = ctx.group('.card');

      ctx.mustRef(rt => [
        amountOfVisible(rt.group(cardsRef), eq(2)),
        countIs(rt.group(cardsRef), eq(2)),
        countIs([rt.el(headerRef)], eq(1)),
      ]);
    });

    const headerSnap = makeSnapshot({ selector: '#header', top: 0, height: 60, text: 'Header' });
    const cardA = makeSnapshot({ selector: '.card', left: 0 });
    const cardB = makeSnapshot({ selector: '.card', left: 200 });

    const store: SnapshotStore = {
      [headerRef!.key]: [headerSnap],
      [cardsRef!.key]: [cardA, cardB],
    };

    const report = runSpecWithSnapshots(spec, store);
    expect(report.specName).toBe('cards grid');
    expect(report.viewTag).toBe('desktop');
    expect(report.viewSize).toEqual({ width: 1280, height: 720 });
    expect(report.violations).toEqual([]);
  });

  it('reports violations when constraints fail', () => {
    let cardsRef!: GroupRef;
    const spec = defineLayoutSpec('cards grid fail', ctx => {
      cardsRef = ctx.group('.card');
      ctx.mustRef(rt => amountOfVisible(rt.group(cardsRef), eq(3)));
    });

    const cardA = makeSnapshot({ selector: '.card', left: 0, visible: true });
    const cardB = makeSnapshot({ selector: '.card', left: 200, visible: false });
    const store: SnapshotStore = {
      [cardsRef!.key]: [cardA, cardB],
    };

    const report = runSpecWithSnapshots(spec, store);
    expect(report.violations.length).toBe(1);
  });
});

