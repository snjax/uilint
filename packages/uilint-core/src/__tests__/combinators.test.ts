import { describe, expect, it } from 'vitest';
import {
  amountOfVisible,
  countIs,
  eq,
  exists,
  forAll,
  gt,
  none,
  pairwise,
  windowed,
  widthIn,
} from '../index.js';
import { makeElem } from './testUtils.js';

describe('Combinators and helpers', () => {
  it('runs nested constraints via forAll', () => {
    const elems = [makeElem('a', { width: 100 }), makeElem('b', { width: 110 })];
    const constraint = forAll(elems, elem => widthIn(elem, gt(50)));
    expect(constraint.check()).toHaveLength(0);

    const failing = forAll(elems, elem => widthIn(elem, gt(150)));
    expect(failing.check().length).toBeGreaterThan(0);
  });

  it('passes when at least one element satisfies exists', () => {
    const elems = [makeElem('a', { width: 50 }), makeElem('b', { width: 200 })];
    expect(exists(elems, elem => widthIn(elem, gt(150))).check()).toHaveLength(0);

    const violations = exists(elems, elem => widthIn(elem, gt(250))).check();
    expect(violations.length).toBe(1);
  });

  it('fails when any element satisfies none', () => {
    const elems = [makeElem('a', { width: 50 }), makeElem('b', { width: 60 })];
    expect(none(elems, elem => widthIn(elem, gt(200))).check()).toHaveLength(0);

    const violations = none(elems, elem => widthIn(elem, gt(40))).check();
    expect(violations.length).toBe(1);
  });

  it('counts elements and visible elements', () => {
    const elems = [
      makeElem('a', { visible: true }),
      makeElem('b', { visible: false }),
      makeElem('c', { visible: true }),
    ];

    expect(countIs(elems, eq(3)).check()).toHaveLength(0);
    expect(countIs(elems, eq(2)).check()).toHaveLength(1);

    expect(amountOfVisible(elems, eq(2)).check()).toHaveLength(0);
    expect(amountOfVisible(elems, eq(3)).check()).toHaveLength(1);
  });

  it('produces adjacent pairs and sliding windows', () => {
    expect(pairwise([1, 2, 3])).toEqual([
      [1, 2],
      [2, 3],
    ]);
    expect(pairwise([1])).toEqual([]);

    expect(windowed([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [2, 3],
      [3, 4],
    ]);
    expect(windowed([1, 2], 3)).toEqual([]);
    expect(windowed([1, 2], 0)).toEqual([]);
  });
});

