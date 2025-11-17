import { describe, expect, it } from 'vitest';
import {
  alignedHorizEqualGap,
  almostSquared,
  between,
  eq,
  sidesHorizontallyInside,
  tableLayout,
} from '../index.js';
import type { TableLayoutOpts } from '../index.js';
import { makeElem } from './testUtils.js';

describe('Extras', () => {
  it('detects almost squared elements', () => {
    const square = makeElem('square', { width: 100, height: 105 });
    const rectangle = makeElem('rectangle', { width: 100, height: 150 });

    expect(almostSquared(square, 0.1).check()).toHaveLength(0);
    expect(almostSquared(rectangle, 0.1).check()).toHaveLength(1);
  });

  it('checks equal horizontal gaps', () => {
    const items = [
      makeElem('a', { left: 0, width: 50 }),
      makeElem('b', { left: 70, width: 50 }),
      makeElem('c', { left: 140, width: 50 }),
    ];
    expect(alignedHorizEqualGap(items, 5).check()).toHaveLength(0);

    const broken = [
      makeElem('a', { left: 0, width: 50 }),
      makeElem('b', { left: 70, width: 50 }),
      makeElem('c', { left: 160, width: 50 }),
    ];
    expect(alignedHorizEqualGap(broken, 5).check().length).toBeGreaterThan(0);
  });

  it('validates table layouts', () => {
    const items = [
      makeElem('r1c1', { left: 0, top: 0, width: 80, height: 40 }),
      makeElem('r1c2', { left: 120, top: 0, width: 80, height: 40 }),
      makeElem('r2c1', { left: 0, top: 80, width: 80, height: 40 }),
      makeElem('r2c2', { left: 120, top: 80, width: 80, height: 40 }),
    ];

    const opts: TableLayoutOpts = {
      columns: 2,
      horizontalMargin: eq(40),
      verticalMargin: between(0, 40),
    };

    expect(tableLayout(items, opts).check()).toHaveLength(0);

    const tooManyColumns = [...items, makeElem('extra', { left: 250, top: 0, width: 50, height: 40 })];
    expect(tableLayout(tooManyColumns, opts).check().length).toBeGreaterThan(0);
  });

  it('checks sides inside containers', () => {
    const container = makeElem('container', { left: 0, width: 400, top: 0, height: 60 });
    const items = [
      makeElem('a', { left: 20, width: 80, top: 0, height: 60 }),
      makeElem('b', { left: 140, width: 80, top: 0, height: 60 }),
      makeElem('c', { left: 260, width: 80, top: 0, height: 60 }),
    ];
    expect(sidesHorizontallyInside(items, container).check()).toHaveLength(0);

    const shifted = [
      makeElem('a', { left: -10, width: 80, top: 0, height: 60 }),
      makeElem('b', { left: 140, width: 80, top: 0, height: 60 }),
    ];
    expect(sidesHorizontallyInside(shifted, container).check().length).toBeGreaterThan(0);
  });
});

