import { describe, expect, it } from 'vitest';
import { above, below, between, heightIn, inside, leftOf, ratio, rightOf, widthIn, eq } from '../index.js';
import type { EdgeRanges } from '../index.js';
import { makeElem } from './testUtils.js';

describe('Positional relations', () => {
  it('validates below/above relations', () => {
    const anchor = makeElem('anchor', { top: 0, height: 20 });
    const target = makeElem('target', { top: 40, height: 10 });

    expect(below(target, anchor, eq(20)).check()).toHaveLength(0);
    expect(below(target, anchor, eq(15)).check()).toHaveLength(1);

    expect(above(anchor, target, eq(20)).check()).toHaveLength(0);
    expect(above(anchor, target, eq(1)).check()).toHaveLength(1);
  });

  it('validates leftOf/rightOf relations', () => {
    const left = makeElem('left', { left: 0, width: 50 });
    const right = makeElem('right', { left: 80, width: 20 });

    expect(leftOf(left, right, eq(30)).check()).toHaveLength(0);
    expect(leftOf(left, right, eq(10)).check()).toHaveLength(1);

    expect(rightOf(right, left, eq(30)).check()).toHaveLength(0);
    expect(rightOf(right, left, eq(10)).check()).toHaveLength(1);
  });

  it('validates inside edges selectively', () => {
    const container = makeElem('container', { left: 0, top: 0, width: 200, height: 100 });
    const child = makeElem('child', { left: 10, top: 5, width: 180, height: 80 });

    const edges: EdgeRanges = {
      left: between(0, 20),
      right: between(0, 20),
      top: between(0, 10),
    };

    expect(inside(child, container, edges).check()).toHaveLength(0);

    const misaligned = makeElem('bad', { left: -5, top: 0, width: 200, height: 90 });
    const violations = inside(misaligned, container, edges).check();
    expect(violations.length).toBeGreaterThan(0);
  });

  it('checks width and height ranges', () => {
    const elem = makeElem('box', { width: 120, height: 60 });
    expect(widthIn(elem, between(100, 130)).check()).toHaveLength(0);
    expect(widthIn(elem, between(10, 20)).check()).toHaveLength(1);

    expect(heightIn(elem, between(50, 70)).check()).toHaveLength(0);
    expect(heightIn(elem, between(10, 20)).check()).toHaveLength(1);
  });

  it('checks ratios with tolerance', () => {
    const elem = makeElem('ratio', { width: 200, height: 100 });
    expect(ratio(elem.width, elem.height, 2, 0.1).check()).toHaveLength(0);
    expect(ratio(elem.width, elem.height, 1, 0.1).check()).toHaveLength(1);
  });
});

