import { describe, expect, it } from 'vitest';
import {
  alignedHorizontally,
  alignedVertically,
  centered,
  textEquals,
  textMatches,
  visible,
  present,
  eq,
  between,
  gte,
} from '../index.js';
import { makeElem } from './testUtils.js';

describe('Alignment, visibility, and text relations', () => {
  it('checks horizontal and vertical alignment', () => {
    const a = makeElem('a', { top: 0, left: 0 });
    const b = makeElem('b', { top: 1, left: 10 });
    const c = makeElem('c', { top: 10, left: 0 });

    expect(alignedHorizontally([a, b], 2).check()).toHaveLength(0);
    expect(alignedHorizontally([a, c], 2).check()).toHaveLength(1);

    const d = makeElem('d', { left: 2 });
    expect(alignedVertically([a, d], 5).check()).toHaveLength(0);
    expect(alignedVertically([a, d], 1).check()).toHaveLength(1);
  });

  it('checks centering along provided axes', () => {
    const container = makeElem('container', { left: 0, top: 0, width: 200, height: 200 });
    const centeredElem = makeElem('centered', { left: 50, top: 50, width: 100, height: 100 });
    const offElem = makeElem('off', { left: 60, top: 60, width: 100, height: 100 });

    expect(centered(centeredElem, container, { h: eq(0), v: eq(0) }).check()).toHaveLength(0);
    expect(centered(offElem, container, { h: between(-10, 10), v: between(-10, 10) }).check()).toHaveLength(
      0,
    );
    expect(centered(offElem, container, { h: eq(0) }).check()).toHaveLength(1);
  });

  it('checks visibility and presence flags', () => {
    const hidden = makeElem('hidden', { visible: false });
    expect(visible(hidden, false).check()).toHaveLength(0);
    expect(visible(hidden, true).check()).toHaveLength(1);

    const missing = makeElem('missing', { present: false });
    expect(present(missing, false).check()).toHaveLength(0);
    expect(present(missing, true).check()).toHaveLength(1);
  });

  it('checks text equality and matching', () => {
    const elem = makeElem('text', { text: 'Hello World' });
    expect(textEquals(elem, 'Hello World').check()).toHaveLength(0);
    expect(textEquals(elem, 'Hi').check()).toHaveLength(1);

    expect(textMatches(elem, /world/i).check()).toHaveLength(0);
    expect(textMatches(elem, 'World').check()).toHaveLength(0);
    expect(textMatches(elem, /foo/).check()).toHaveLength(1);
  });

  it('allows flexible root-based centering checks', () => {
    const root = makeElem('root', { width: 300, height: 100 });
    const child = makeElem('child', { left: 100, top: 30, width: 100, height: 40 });
    expect(centered(child, root, { h: eq(0), v: gte(-5) }).check()).toHaveLength(0);
  });
});

