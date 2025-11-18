import { describe, expect, it } from 'vitest';
import { createElem } from '../index.js';
import type { ElemSnapshot } from '../index.js';

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
});

const baseSnapshot: ElemSnapshot = {
  selector: '#node',
  box: rect(10, 20, 60, 30),
  view: rect(10, 20, 60, 30),
  canvas: rect(10, 20, 60, 30),
  visible: true,
  present: true,
  text: 'Hello world',
};

describe('Elem runtime wrapper', () => {
  it('exposes geometry getters derived from snapshot', () => {
    const elem = createElem({ name: 'node', snapshot: baseSnapshot });

    expect(elem.left).toBe(baseSnapshot.box.left);
    expect(elem.top).toBe(baseSnapshot.box.top);
    expect(elem.right).toBe(baseSnapshot.box.left + baseSnapshot.box.width);
    expect(elem.bottom).toBe(baseSnapshot.box.top + baseSnapshot.box.height);
    expect(elem.width).toBe(baseSnapshot.box.width);
    expect(elem.height).toBe(baseSnapshot.box.height);
    expect(elem.centerX).toBe(baseSnapshot.box.left + baseSnapshot.box.width / 2);
    expect(elem.centerY).toBe(baseSnapshot.box.top + baseSnapshot.box.height / 2);
  });

  it('exposes visibility and text information', () => {
    const elem = createElem({ name: 'node', snapshot: baseSnapshot });

    expect(elem.visible).toBe(true);
    expect(elem.present).toBe(true);
    expect(elem.text).toBe('Hello world');
  });

  it('provides access to the underlying snapshot and name', () => {
    const elem = createElem({ name: 'menu item', snapshot: baseSnapshot });

    expect(elem.name).toBe('menu item');
    expect(elem.snap).toBe(baseSnapshot);
  });

  it('delegates findChild if provided', () => {
    const childSnapshot: ElemSnapshot = {
      selector: '#child',
      box: rect(0, 0, 10, 10),
      view: rect(0, 0, 10, 10),
      canvas: rect(0, 0, 10, 10),
      visible: true,
      present: true,
      text: 'child',
    };
    const childElem = createElem({ name: 'child', snapshot: childSnapshot });

    const elem = createElem({
      name: 'parent',
      snapshot: baseSnapshot,
      findChild: key => (key === 'child' ? childElem : undefined),
    });

    expect(elem.findChild?.('child')).toBe(childElem);
    expect(elem.findChild?.('missing')).toBeUndefined();
  });
});

