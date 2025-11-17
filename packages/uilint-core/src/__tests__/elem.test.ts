import { describe, expect, it } from 'vitest';
import { createElem } from '../index.js';
import type { ElemSnapshot } from '../index.js';

const baseSnapshot: ElemSnapshot = {
  selector: '#node',
  left: 10,
  top: 20,
  right: 70,
  bottom: 50,
  width: 60,
  height: 30,
  visible: true,
  present: true,
  text: 'Hello world',
};

describe('Elem runtime wrapper', () => {
  it('exposes geometry getters derived from snapshot', () => {
    const elem = createElem({ name: 'node', snapshot: baseSnapshot });

    expect(elem.left).toBe(baseSnapshot.left);
    expect(elem.top).toBe(baseSnapshot.top);
    expect(elem.right).toBe(baseSnapshot.right);
    expect(elem.bottom).toBe(baseSnapshot.bottom);
    expect(elem.width).toBe(baseSnapshot.width);
    expect(elem.height).toBe(baseSnapshot.height);
    expect(elem.centerX).toBe(baseSnapshot.left + baseSnapshot.width / 2);
    expect(elem.centerY).toBe(baseSnapshot.top + baseSnapshot.height / 2);
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
      left: 0,
      top: 0,
      right: 10,
      bottom: 10,
      width: 10,
      height: 10,
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

