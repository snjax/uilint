import { describe, expect, it } from 'vitest';
import { singleLineText, textDoesNotOverflow, textLinesAtMost } from '../index.js';
import type { TextMetrics } from '../index.js';
import { makeElem } from './testUtils.js';

const makeMetrics = (overrides: Partial<TextMetrics>): TextMetrics => ({
  lineCount: overrides.lineCount ?? overrides.lineRects?.length ?? 0,
  lineRects: overrides.lineRects ?? [],
  boundingRect: overrides.boundingRect ?? null,
});

describe('Text relations', () => {
  it('passes textDoesNotOverflow when content fits', () => {
    const metrics = makeMetrics({
      lineCount: 1,
      lineRects: [{ left: 10, top: 10, width: 80, height: 10 }],
      boundingRect: { left: 10, top: 10, width: 80, height: 10 },
    });
    const elem = makeElem('label', {
      box: { left: 0, top: 0, width: 120, height: 40 },
      textMetrics: metrics,
    });
    expect(textDoesNotOverflow(elem).check()).toHaveLength(0);
  });

  it('fails textDoesNotOverflow when canvas overflows', () => {
    const elem = makeElem('label', {
      box: { left: 0, top: 0, width: 100, height: 20 },
      canvas: { left: 0, top: 0, width: 120, height: 20 },
      textMetrics: makeMetrics({
        lineRects: [{ left: 0, top: 0, width: 100, height: 20 }],
        boundingRect: { left: 0, top: 0, width: 120, height: 20 },
      }),
    });
    const violations = textDoesNotOverflow(elem).check();
    expect(violations.length).toBeGreaterThan(0);
  });

  it('fails textDoesNotOverflow when text bleeds outside box', () => {
    const elem = makeElem('label', {
      box: { left: 10, top: 0, width: 80, height: 20 },
      textMetrics: makeMetrics({
        lineRects: [{ left: 0, top: 0, width: 80, height: 20 }],
        boundingRect: { left: 0, top: 0, width: 80, height: 20 },
      }),
    });
    const violations = textDoesNotOverflow(elem).check();
    expect(violations.some(v => v.constraint.includes('.left'))).toBe(true);
  });

  it('passes textLinesAtMost when count fits threshold', () => {
    const elem = makeElem('title', {
      textMetrics: makeMetrics({
        lineCount: 2,
        lineRects: [
          { left: 0, top: 0, width: 80, height: 10 },
          { left: 0, top: 12, width: 80, height: 10 },
        ],
        boundingRect: { left: 0, top: 0, width: 80, height: 22 },
      }),
    });
    expect(textLinesAtMost(elem, 2).check()).toHaveLength(0);
  });

  it('fails textLinesAtMost when exceeding threshold', () => {
    const elem = makeElem('title', {
      textMetrics: makeMetrics({
        lineCount: 3,
        lineRects: [
          { left: 0, top: 0, width: 80, height: 10 },
          { left: 0, top: 12, width: 80, height: 10 },
          { left: 0, top: 24, width: 80, height: 10 },
        ],
        boundingRect: { left: 0, top: 0, width: 80, height: 34 },
      }),
    });
    const violations = textLinesAtMost(elem, 2).check();
    expect(violations).toHaveLength(1);
    expect(violations[0]!.details).toMatchObject({ lineCount: 3, maxLines: 2 });
  });

  it('combines constraints in singleLineText', () => {
    const elem = makeElem('input-label', {
      box: { left: 0, top: 0, width: 80, height: 16 },
      canvas: { left: 0, top: 0, width: 120, height: 16 },
      textMetrics: makeMetrics({
        lineCount: 2,
        lineRects: [
          { left: 0, top: 0, width: 80, height: 8 },
          { left: 0, top: 10, width: 80, height: 8 },
        ],
        boundingRect: { left: 0, top: 0, width: 80, height: 18 },
      }),
    });
    const violations = singleLineText(elem).check();
    expect(violations.length).toBeGreaterThan(1);
    expect(violations.some(v => v.constraint.includes('.overflow'))).toBe(true);
    expect(violations.some(v => v.constraint.includes('.maxLines'))).toBe(true);
  });
});

