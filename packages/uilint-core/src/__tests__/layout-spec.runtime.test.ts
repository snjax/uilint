import { describe, expect, it } from 'vitest';
import { amountOfVisible, classifyViewport, countIs, defineLayoutSpec, eq, evaluateLayoutSpecOnSnapshots } from '../index.js';
import type {
  ElemRef,
  GroupRef,
  LayoutReport,
  LayoutSpec,
  SnapshotStore,
  ViewportClass,
  ConstraintSource,
} from '../index.js';
import { makeSnapshot } from './testUtils.js';

function runSpecWithSnapshots(spec: LayoutSpec, snapshots: SnapshotStore): LayoutReport {
  const view = makeSnapshot({ selector: 'view', width: 1280, height: 720 });
  const canvas = makeSnapshot({ selector: 'canvas', width: 1280, height: 2000 });
  return evaluateLayoutSpecOnSnapshots(spec, snapshots, {
    view,
    canvas,
    viewTag: 'desktop',
    scenarioName: 'test-scenario',
    snapshotName: 'test-snapshot',
  });
}

describe('Layout spec runtime evaluation', () => {
  it('creates runtime elements and reports success', () => {
    let headerRef!: ElemRef;
    let cardsRef!: GroupRef;
    const spec = defineLayoutSpec(ctx => {
      headerRef = ctx.el('#header');
      cardsRef = ctx.group('.card');

      ctx.must(rt => {
        const constraints: ConstraintSource[] = [
          amountOfVisible(cardsRef, eq(2)),
          countIs(cardsRef, eq(2)),
          countIs([headerRef], eq(1)),
        ];

        constraints.push({
          name: 'viewport-class',
          check() {
            return rt.viewportClass === 'desktop'
              ? []
              : [
                  {
                    constraint: 'viewport-class',
                    message: `Expected desktop viewport, got ${rt.viewportClass}`,
                  },
                ];
          },
        });

        return constraints;
      });
    });

    const headerSnap = makeSnapshot({ selector: '#header', top: 0, height: 60, text: 'Header' });
    const cardA = makeSnapshot({ selector: '.card', left: 0 });
    const cardB = makeSnapshot({ selector: '.card', left: 200 });

    const store: SnapshotStore = {
      [headerRef!.key]: [headerSnap],
      [cardsRef!.key]: [cardA, cardB],
    };

    const report = runSpecWithSnapshots(spec, store);
    expect(report.scenarioName).toBe('test-scenario');
    expect(report.snapshotName).toBe('test-snapshot');
    expect(report.viewTag).toBe('desktop');
    expect(report.viewSize).toEqual({ width: 1280, height: 720 });
    expect(report.viewportClass).toBe('desktop');
    expect(report.violations).toEqual([]);
  });

  it('reports violations when constraints fail', () => {
    let cardsRef!: GroupRef;
    const spec = defineLayoutSpec(ctx => {
      cardsRef = ctx.group('.card');
      ctx.must(amountOfVisible(cardsRef, eq(3)));
    });

    const cardA = makeSnapshot({ selector: '.card', left: 0, visible: true });
    const cardB = makeSnapshot({ selector: '.card', left: 200, visible: false });
    const store: SnapshotStore = {
      [cardsRef!.key]: [cardA, cardB],
    };

    const report = runSpecWithSnapshots(spec, store);
    expect(report.violations.length).toBe(1);
  });

  it('infers viewport class from width when not provided explicitly', () => {
    const spec = defineLayoutSpec(() => {});
    const snapshots: SnapshotStore = {};
    const view = makeSnapshot({ selector: 'view', width: 500, height: 900 });
    const canvas = makeSnapshot({ selector: 'canvas', width: 500, height: 1800 });
    const report = evaluateLayoutSpecOnSnapshots(spec, snapshots, {
      view,
      canvas,
    });
    expect(report.viewportClass).toBe('mobile');
  });

  it('overrides viewport class when provided', () => {
    const spec = defineLayoutSpec(() => {});
    const snapshots: SnapshotStore = {};
    const view = makeSnapshot({ selector: 'view', width: 900, height: 900 });
    const report = evaluateLayoutSpecOnSnapshots(spec, snapshots, {
      view,
      canvas: view,
      viewportClass: 'desktop',
    });
    expect(report.viewportClass).toBe('desktop');
  });

  it('classifies widths via helper', () => {
    const cases: Array<{ width: number; expected: ViewportClass }> = [
      { width: 375, expected: 'mobile' },
      { width: 900, expected: 'tablet' },
      { width: 1400, expected: 'desktop' },
    ];
    cases.forEach(({ width, expected }) => {
      expect(classifyViewport(width)).toBe(expected);
    });
  });
});
