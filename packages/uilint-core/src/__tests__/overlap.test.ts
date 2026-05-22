import { describe, expect, it } from 'vitest';
import { noOverlap } from '../index.js';
import { check, makeElem } from './testUtils.js';

describe('noOverlap', () => {
  it('passes for disjoint elements', () => {
    const first = makeElem('first', { left: 0, top: 0, width: 50, height: 50 });
    const second = makeElem('second', { left: 60, top: 0, width: 50, height: 50 });

    expect(check(noOverlap([first, second]))).toHaveLength(0);
  });

  it('fails for an overlapping pair', () => {
    const first = makeElem('first', { left: 0, top: 0, width: 50, height: 50 });
    const second = makeElem('second', { left: 25, top: 20, width: 50, height: 50 });

    const violations = check(noOverlap([first, second]));

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      constraint: 'noOverlap[0,1]',
      message: 'first overlaps second',
      details: { overlapX: 25, overlapY: 30, tolerance: 0 },
    });
  });

  it('respects tolerance', () => {
    const first = makeElem('first', { left: 0, top: 0, width: 50, height: 50 });
    const second = makeElem('second', { left: 46, top: 46, width: 50, height: 50 });

    expect(check(noOverlap([first, second], { tolerance: 4 }))).toHaveLength(0);
    expect(check(noOverlap([first, second], { tolerance: 3 }))).toHaveLength(1);
  });

  it('ignores elements with visible false', () => {
    const first = makeElem('first', { left: 0, top: 0, width: 50, height: 50 });
    const hidden = makeElem('hidden', {
      left: 25,
      top: 25,
      width: 50,
      height: 50,
      visible: false,
    });

    expect(check(noOverlap([first, hidden]))).toHaveLength(0);
  });
});
