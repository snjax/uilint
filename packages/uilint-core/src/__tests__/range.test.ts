import { describe, expect, it } from 'vitest';
import { approx, anyRange, between, eq, gt, gte, lt, lte } from '../index.js';

describe('Range helpers', () => {
  it('matches equality', () => {
    const matcher = eq(10);
    expect(matcher(10)).toBe(true);
    expect(matcher(9)).toBe(false);
  });

  it('matches strict comparisons', () => {
    expect(gt(5)(6)).toBe(true);
    expect(gt(5)(5)).toBe(false);

    expect(lt(2)(1)).toBe(true);
    expect(lt(2)(2)).toBe(false);
  });

  it('matches inclusive comparisons', () => {
    expect(gte(5)(5)).toBe(true);
    expect(gte(5)(4.9)).toBe(false);

    expect(lte(10)(10)).toBe(true);
    expect(lte(10)(10.1)).toBe(false);
  });

  it('matches inclusive ranges', () => {
    const matcher = between(0, 1);
    expect(matcher(0)).toBe(true);
    expect(matcher(0.4)).toBe(true);
    expect(matcher(1)).toBe(true);
    expect(matcher(-0.01)).toBe(false);
    expect(matcher(1.01)).toBe(false);
  });

  it('respects tolerance for approx', () => {
    const matcher = approx(100, 0.5);
    expect(matcher(100.4)).toBe(true);
    expect(matcher(99.6)).toBe(true);
    expect(matcher(100.6)).toBe(false);
  });

  it('accepts any value with anyRange', () => {
    expect(anyRange(Number.NEGATIVE_INFINITY)).toBe(true);
    expect(anyRange(Number.POSITIVE_INFINITY)).toBe(true);
    expect(anyRange(0)).toBe(true);
  });
});

