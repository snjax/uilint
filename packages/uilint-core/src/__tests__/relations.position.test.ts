import { describe, expect, it } from 'vitest';
import {
  above,
  below,
  between,
  eq,
  heightIn,
  inside,
  leftOf,
  near,
  on,
  ratio,
  rightOf,
  widthIn,
  widthMatches,
} from '../index.js';
import type { EdgeRanges } from '../index.js';
import { makeElem, check } from './testUtils.js';

describe('Positional relations', () => {
  it('validates below/above relations', () => {
    const anchor = makeElem('anchor', { top: 0, height: 20 });
    const target = makeElem('target', { top: 40, height: 10 });

    expect(check(below(target, anchor, eq(20)))).toHaveLength(0);
    expect(check(below(target, anchor, eq(15)))).toHaveLength(1);

    expect(check(above(anchor, target, eq(20)))).toHaveLength(0);
    expect(check(above(anchor, target, eq(1)))).toHaveLength(1);
  });

  it('validates leftOf/rightOf relations', () => {
    const left = makeElem('left', { left: 0, width: 50 });
    const right = makeElem('right', { left: 80, width: 20 });

    expect(check(leftOf(left, right, eq(30)))).toHaveLength(0);
    expect(check(leftOf(left, right, eq(10)))).toHaveLength(1);

    expect(check(rightOf(right, left, eq(30)))).toHaveLength(0);
    expect(check(rightOf(right, left, eq(10)))).toHaveLength(1);
  });

  it('validates inside edges selectively', () => {
    const container = makeElem('container', { left: 0, top: 0, width: 200, height: 100 });
    const child = makeElem('child', { left: 10, top: 5, width: 180, height: 80 });

    const edges: EdgeRanges = {
      left: between(0, 20),
      right: between(0, 20),
      top: between(0, 10),
    };

    expect(check(inside(child, container, edges))).toHaveLength(0);

    const misaligned = makeElem('bad', { left: -5, top: 0, width: 200, height: 90 });
    const violations = check(inside(misaligned, container, edges));
    expect(violations.length).toBeGreaterThan(0);
  });

  it('enforces strict inside by default', () => {
    const container = makeElem('container', { left: 0, top: 0, width: 100, height: 100 });
    const child = makeElem('child', { left: 10, top: 10, width: 50, height: 50 });
    expect(check(inside(child, container))).toHaveLength(0);

    const overflowing = makeElem('overflow', { left: 60, top: 60, width: 60, height: 60 });
    expect(check(inside(overflowing, container))).toHaveLength(2);
  });

  it('validates near relation with direction', () => {
    const field = makeElem('field', { left: 0, top: 0, width: 50, height: 50 });
    const button = makeElem('button', { left: 70, top: 60, width: 40, height: 30 });

    expect(
      check(near(field, button, {
        right: between(15, 25),
        bottom: between(5, 15),
      })),
    ).toHaveLength(0);

    expect(
      check(near(field, button, {
        right: between(1, 10),
      })),
    ).toHaveLength(1);
  });

  it('compares widths with relative tolerance and ratios', () => {
    const ref = makeElem('ref', { width: 200, height: 100 });
    const candidate = makeElem('candidate', { width: 210, height: 100 });

    expect(check(widthMatches(candidate, ref, { tolerance: 0.1 }))).toHaveLength(0);
    expect(check(widthMatches(candidate, ref, { tolerance: 0.01 }))).toHaveLength(1);

    const smaller = makeElem('smaller', { width: 150, height: 100 });
    expect(check(widthMatches(smaller, ref, { ratio: between(0.7, 0.8) }))).toHaveLength(0);
    expect(check(widthMatches(smaller, ref, { ratio: between(0.9, 1) }))).toHaveLength(1);
  });

  it('positions element on reference edges', () => {
    const container = makeElem('container', { left: 50, top: 50, width: 100, height: 100 });
    const label = makeElem('label', { left: 20, top: 20, width: 20, height: 20 });

    const onCorner = on(
      label,
      container,
      {
        horizontal: { elementEdge: 'right', referenceEdge: 'left', range: eq(10) },
        vertical: { elementEdge: 'bottom', referenceEdge: 'top', range: eq(10) },
      },
      'onCorner',
    );

    expect(check(onCorner)).toHaveLength(0);

    const bad = makeElem('bad', { left: 30, top: 30, width: 20, height: 20 });
    expect(
      check(on(
        bad,
        container,
        {
          horizontal: { elementEdge: 'right', referenceEdge: 'left', range: eq(10) },
        },
      )),
    ).toHaveLength(1);
  });

  it('checks width and height ranges', () => {
    const elem = makeElem('box', { width: 120, height: 60 });
    expect(check(widthIn(elem, between(100, 130)))).toHaveLength(0);
    expect(check(widthIn(elem, between(10, 20)))).toHaveLength(1);

    expect(check(heightIn(elem, between(50, 70)))).toHaveLength(0);
    expect(check(heightIn(elem, between(10, 20)))).toHaveLength(1);
  });

  it('checks ratios with tolerance', () => {
    const elem = makeElem('ratio', { width: 200, height: 100 });
    expect(check(ratio(elem.width, elem.height, 2, 0.1))).toHaveLength(0);
    expect(check(ratio(elem.width, elem.height, 1, 0.1))).toHaveLength(1);
  });

  describe('inside', () => {
    it('passes when element is inside box', () => {
      const box = makeElem('box', { width: 800, height: 600 });
      const el = makeElem('el', { left: 10, top: 10, width: 100, height: 100 });
      expect(check(inside(el, box))).toHaveLength(0);
    });
  });
});
