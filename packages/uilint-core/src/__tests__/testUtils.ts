import { createElem } from '../index.js';
import type { Elem, ElemSnapshot, FrameRect } from '../index.js';

const DEFAULT_WIDTH = 100;
const DEFAULT_HEIGHT = 40;

type RectOverride = Partial<FrameRect> & Partial<Record<'right' | 'bottom', number>>;

type SnapshotOverrides = Partial<ElemSnapshot> & {
  box?: RectOverride;
  view?: RectOverride;
  canvas?: RectOverride;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  right?: number;
  bottom?: number;
};

const normalizeRect = (
  base: { left: number; top: number; width: number; height: number },
  override?: RectOverride,
): FrameRect => {
  const left = override?.left ?? base.left;
  const top = override?.top ?? base.top;
  const width =
    override?.width ??
    (override?.right !== undefined ? override.right - left : base.width);
  const height =
    override?.height ??
    (override?.bottom !== undefined ? override.bottom - top : base.height);
  return { left, top, width, height };
};

export function makeSnapshot(overrides: SnapshotOverrides = {}): ElemSnapshot {
  const baseLeft = overrides.left ?? overrides.box?.left ?? 0;
  const baseTop = overrides.top ?? overrides.box?.top ?? 0;
  const baseWidth = overrides.width ?? overrides.box?.width ?? DEFAULT_WIDTH;
  const baseHeight = overrides.height ?? overrides.box?.height ?? DEFAULT_HEIGHT;

  const box = normalizeRect({ left: baseLeft, top: baseTop, width: baseWidth, height: baseHeight }, overrides.box);
  const view = normalizeRect(
    { left: box.left, top: box.top, width: box.width, height: box.height },
    overrides.view,
  );
  const canvas = normalizeRect(
    { left: box.left, top: box.top, width: box.width, height: box.height },
    overrides.canvas,
  );

  return {
    selector: overrides.selector ?? '#elem',
    index: overrides.index,
    box,
    view,
    canvas,
    visible: overrides.visible ?? true,
    present: overrides.present ?? true,
    text: overrides.text ?? '',
    textMetrics: overrides.textMetrics,
    meta: overrides.meta,
  };
}

export function makeElem(name: string, overrides: SnapshotOverrides = {}): Elem {
  return createElem({
    name,
    snapshot: makeSnapshot({
      selector: overrides.selector ?? `#${name}`,
      ...overrides,
    }),
  });
}

