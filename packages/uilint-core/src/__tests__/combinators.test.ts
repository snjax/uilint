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
import { makeElem, check } from './testUtils.js';

describe('Combinators and helpers', () => {
  it('runs nested constraints via forAll', () => {
    const elems = [makeElem('a', { width: 100 }), makeElem('b', { width: 110 })];
    const constraint = forAll(elems, elem => widthIn(elem, gt(50)));
    expect(check(constraint)).toHaveLength(0);

    const failing = forAll(elems, elem => widthIn(elem, gt(150)));
    expect(check(failing).length).toBeGreaterThan(0);
  });

  it('passes when at least one element satisfies exists', () => {
    const elems = [makeElem('a', { width: 50 }), makeElem('b', { width: 200 })];
    expect(check(exists(elems, elem => widthIn(elem, gt(150))))).toHaveLength(0);

    const violations = check(exists(elems, elem => widthIn(elem, gt(250))));
    expect(violations.length).toBe(1);
  });

  it('fails when any element satisfies none', () => {
    const elems = [makeElem('a', { width: 50 }), makeElem('b', { width: 60 })];
    expect(check(none(elems, elem => widthIn(elem, gt(200))))).toHaveLength(0);

    const violations = check(none(elems, elem => widthIn(elem, gt(40))));
    expect(violations.length).toBe(1);
  });

  it('counts elements and visible elements', () => {
    const elems = [
      makeElem('a', { visible: true }),
      makeElem('b', { visible: false }),
      makeElem('c', { visible: true }),
    ];

    expect(check(countIs(elems, eq(3)))).toHaveLength(0);
    expect(check(countIs(elems, eq(2)))).toHaveLength(1);

    expect(check(amountOfVisible(elems, eq(2)))).toHaveLength(0);
    expect(check(amountOfVisible(elems, eq(3)))).toHaveLength(1);
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
