import { describe, expect, it } from 'vitest';
import {
  colorDistance,
  deltaE2000,
  gte,
  MIN_TEXT_BG_DISTANCE,
  parseCssColor,
} from '../index.js';
import { check, makeElem } from './testUtils.js';

describe('Color parsing', () => {
  it('parses rgb()', () => {
    expect(parseCssColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  });

  it('parses rgba()', () => {
    expect(parseCssColor('rgba(1, 2, 3, 0.5)')).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
  });

  it('parses #rrggbb', () => {
    expect(parseCssColor('#0a141e')).toEqual({ r: 10, g: 20, b: 30, a: 1 });
  });

  it('parses #rgb', () => {
    expect(parseCssColor('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
  });

  it('parses #rrggbbaa', () => {
    expect(parseCssColor('#0a141e80')).toEqual({ r: 10, g: 20, b: 30, a: 128 / 255 });
  });

  it('parses transparent', () => {
    expect(parseCssColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('returns null for invalid strings', () => {
    expect(parseCssColor('not-a-color')).toBeNull();
  });
});

describe('deltaE2000', () => {
  it('returns about 100 for black vs white', () => {
    expect(deltaE2000('rgb(0,0,0)', 'rgb(255,255,255)')).toBeCloseTo(100, 0);
  });

  it('returns 0 for identical colors', () => {
    expect(deltaE2000('rgb(12, 34, 56)', 'rgb(12, 34, 56)')).toBe(0);
  });

  it('throws on unparseable colors', () => {
    expect(() => deltaE2000('nope', 'rgb(0,0,0)')).toThrow(/Unable to parse CSS color/);
  });
});

describe('colorDistance', () => {
  it('passes when colors are far apart and range is satisfied', () => {
    const text = makeElem('card', {
      color: 'rgb(0, 0, 0)',
      backgroundColor: 'rgb(255, 255, 255)',
    });

    expect(check(colorDistance(text, text, gte(MIN_TEXT_BG_DISTANCE)))).toHaveLength(0);
  });

  it('fails when colors are too close for the range', () => {
    const text = makeElem('label', { color: 'rgb(10, 10, 10)' });
    const background = makeElem('panel', { backgroundColor: 'rgb(12, 12, 12)' });

    const violations = check(colorDistance(text, background, gte(10)));

    expect(violations).toHaveLength(1);
    expect(violations[0]?.details).toMatchObject({ value: expect.any(Number) });
  });

  it('emits an indeterminate violation when the background is not opaque', () => {
    const text = makeElem('label', { color: 'rgb(0, 0, 0)' });
    const background = makeElem('panel', { backgroundColor: 'rgba(255, 255, 255, 0.5)' });

    const violations = check(colorDistance(text, background, gte(10)));

    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toContain('is not opaque');
    expect(violations[0]?.details).toEqual({ element: 'panel', alpha: 0.5 });
  });

  it('emits a missing-data violation when a channel is undefined', () => {
    const text = makeElem('label');
    const background = makeElem('panel', { backgroundColor: 'rgb(255, 255, 255)' });

    const violations = check(colorDistance(text, background, gte(10)));

    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toContain("Color channel 'color' is not available on label");
    expect(violations[0]?.details).toEqual({ element: 'label', channel: 'color' });
  });
});
