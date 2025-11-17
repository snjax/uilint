import { createElem } from '../index.js';
import type { Elem, ElemSnapshot } from '../index.js';

const DEFAULT_WIDTH = 100;
const DEFAULT_HEIGHT = 40;

export function makeSnapshot(overrides: Partial<ElemSnapshot> = {}): ElemSnapshot {
  const width = overrides.width ?? DEFAULT_WIDTH;
  const height = overrides.height ?? DEFAULT_HEIGHT;
  const left = overrides.left ?? 0;
  const top = overrides.top ?? 0;
  return {
    selector: overrides.selector ?? '#elem',
    index: overrides.index,
    left,
    top,
    width,
    height,
    right: overrides.right ?? left + width,
    bottom: overrides.bottom ?? top + height,
    visible: overrides.visible ?? true,
    present: overrides.present ?? true,
    text: overrides.text ?? '',
    meta: overrides.meta,
  };
}

export function makeElem(name: string, overrides: Partial<ElemSnapshot> = {}): Elem {
  return createElem({
    name,
    snapshot: makeSnapshot({
      selector: overrides.selector ?? `#${name}`,
      ...overrides,
    }),
  });
}

