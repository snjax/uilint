/**
 * @notice Canonical rectangle description within a given frame.
 */
export interface FrameRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface TextMetrics {
  readonly lineCount: number;
  readonly lineRects: FrameRect[];
  readonly boundingRect: FrameRect | null;
}

/**
 * Snapshot of a DOM element captured by the Playwright runtime.
 * Includes all frame variants so that constraints can choose the desired view.
 */
export interface ElemSnapshot {
  readonly selector: string;
  readonly index?: number;
  readonly box: FrameRect;
  readonly view: FrameRect;
  readonly canvas: FrameRect;
  readonly visible: boolean;
  readonly present: boolean;
  readonly text: string;
  readonly textMetrics?: TextMetrics;
  readonly meta?: Record<string, unknown>;
}

/**
 * Runtime representation of an element that exposes convenient getters and
 * never talks to the browser directly.
 */
export interface Elem {
  readonly name: string;
  readonly snap: ElemSnapshot;

  readonly box: FrameRect;
  readonly view: FrameRect;
  readonly canvas: FrameRect;

  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;

  readonly visible: boolean;
  readonly present: boolean;
  readonly text: string;
  readonly textMetrics?: TextMetrics;

  getRect(frame?: 'box' | 'view' | 'canvas'): FrameRect;

  findChild?(key: string): Elem | undefined;
}

/**
 * Group is a simple alias for an array of runtime elements.
 */
export type Group = Elem[];

export interface ElemFactoryOptions {
  readonly name: string;
  readonly snapshot: ElemSnapshot;
  readonly findChild?: (key: string) => Elem | undefined;
}

export type ViewportClass = 'mobile' | 'tablet' | 'desktop';

const MOBILE_MAX_WIDTH = 767;
const TABLET_MAX_WIDTH = 1199;

export function classifyViewport(width: number): ViewportClass {
  if (width <= MOBILE_MAX_WIDTH) {
    return 'mobile';
  }
  if (width <= TABLET_MAX_WIDTH) {
    return 'tablet';
  }
  return 'desktop';
}

type FrameName = 'box' | 'view' | 'canvas';

const computeRight = (rect: FrameRect): number => rect.left + rect.width;
const computeBottom = (rect: FrameRect): number => rect.top + rect.height;

class ElemImpl implements Elem {
  public readonly name: string;
  public readonly snap: ElemSnapshot;
  private readonly childResolver?: (key: string) => Elem | undefined;

  constructor(options: ElemFactoryOptions) {
    this.name = options.name;
    this.snap = options.snapshot;
    this.childResolver = options.findChild;
  }

  private rect(frame: FrameName): FrameRect {
    return this.snap[frame];
  }

  public get box(): FrameRect {
    return this.snap.box;
  }

  public get view(): FrameRect {
    return this.snap.view;
  }

  public get canvas(): FrameRect {
    return this.snap.canvas;
  }

  public get left(): number {
    return this.snap.box.left;
  }

  public get top(): number {
    return this.snap.box.top;
  }

  public get right(): number {
    return computeRight(this.snap.box);
  }

  public get bottom(): number {
    return computeBottom(this.snap.box);
  }

  public get width(): number {
    return this.snap.box.width;
  }

  public get height(): number {
    return this.snap.box.height;
  }

  public get centerX(): number {
    return this.left + this.width / 2;
  }

  public get centerY(): number {
    return this.top + this.height / 2;
  }

  public get visible(): boolean {
    return this.snap.visible;
  }

  public get present(): boolean {
    return this.snap.present;
  }

  public get text(): string {
    return this.snap.text;
  }

  public get textMetrics(): TextMetrics | undefined {
    if (this.snap.textMetrics) {
      return this.snap.textMetrics;
    }
    const meta = this.snap.meta as { textMetrics?: TextMetrics } | undefined;
    return meta?.textMetrics;
  }

  public getRect(frame: FrameName = 'box'): FrameRect {
    return this.rect(frame);
  }

  public findChild(key: string): Elem | undefined {
    return this.childResolver?.(key);
  }
}

/**
 * Convenience helper that creates a runtime element from a snapshot.
 */
export function createElem(options: ElemFactoryOptions): Elem {
  return new ElemImpl(options);
}

export type Range = ((value: number) => boolean) & { desc?: string };

function createRange(check: (value: number) => boolean, desc: string): Range {
  const range: Range = (value) => check(value);
  range.desc = desc;
  return range;
}

/** Matches values that are exactly equal to the target. */
export const eq = (target: number): Range => createRange(value => value === target, `== ${target}`);

/** Matches values strictly greater than the target. */
export const gt = (target: number): Range => createRange(value => value > target, `> ${target}`);

/** Matches values greater than or equal to the target. */
export const gte = (target: number): Range => createRange(value => value >= target, `>= ${target}`);

/** Matches values strictly less than the target. */
export const lt = (target: number): Range => createRange(value => value < target, `< ${target}`);

/** Matches values less than or equal to the target. */
export const lte = (target: number): Range => createRange(value => value <= target, `<= ${target}`);

/** Matches values that fall within the inclusive [min, max] interval. */
export const between = (min: number, max: number): Range => createRange(value => value >= min && value <= max, `[${min}, ${max}]`);

/**
 * Matches values that are approximately equal to the expected number,
 * allowing a symmetric tolerance.
 */
export const approx = (expected: number, tolerance: number): Range => createRange(
  value => Math.abs(value - expected) <= tolerance,
  `~= ${expected} (±${tolerance})`
);

/** Matches any numeric value. */
export const anyRange: Range = createRange(() => true, 'any');

/**
 * @notice Range helper that checks equality within a relative tolerance.
 * @param expected Baseline value to compare with.
 * @param tolerance Relative tolerance expressed as fraction (0.05 = 5%).
 */
export const approxRelative = (expected: number, tolerance: number): Range => {
  if (tolerance < 0) {
    throw new Error('Tolerance must be non-negative');
  }
  return createRange(
    value => {
      const delta = Math.abs(value - expected);
      const maxMagnitude = Math.max(Math.abs(value), Math.abs(expected));
      if (maxMagnitude === 0) {
        return delta === 0;
      }
      return delta <= tolerance * maxMagnitude;
    },
    `~= ${expected} (±${tolerance * 100}%)`
  );
};

export interface Violation {
  readonly constraint: string;
  readonly message: string;
  readonly details?: unknown;
}

export interface Constraint {
  readonly name: string;
  check(): Violation[];
}

export type ConstraintSource = Constraint | LayoutConstraint | ConstraintSource[];

/**
 * A LayoutConstraint is a factory that resolves against the runtime context
 * to produce an executable Constraint.
 */
export type LayoutConstraint = (rt: RuntimeCtx) => ConstraintSource;

export interface ElemRef {
  readonly key: string;
}

export interface GroupRef {
  readonly key: string;
}

export type ElemTarget = Elem | ElemRef;
export type GroupTarget = Group | GroupRef | ElemTarget[];

function isElemRef(x: unknown): x is ElemRef {
  return typeof x === 'object' && x !== null && 'key' in x && !('snap' in x);
}

function isGroupRef(x: unknown): x is GroupRef {
  return typeof x === 'object' && x !== null && 'key' in x && !Array.isArray(x);
}

function resolveElem(rt: RuntimeCtx, target: ElemTarget): Elem {
  return isElemRef(target) ? rt.el(target) : target;
}

function resolveGroup(rt: RuntimeCtx, target: GroupTarget): Group {
  if (Array.isArray(target)) {
    return target.map(item => resolveElem(rt, item));
  }
  return isGroupRef(target) ? rt.group(target) : target;
}

const DEFAULT_ROW_TOLERANCE_PX = 5;
const TEXT_OVERFLOW_TOLERANCE_PX = 1;

function buildConstraint(
  name: string | undefined,
  fallback: string,
  check: () => Violation[],
): Constraint {
  return {
    name: name ?? fallback,
    check,
  };
}

function createViolation(constraint: string, message: string, details?: unknown): Violation {
  return { constraint, message, details };
}

function evaluateRange(
  range: Range,
  value: number,
  constraint: string,
  message: string,
  details?: Record<string, unknown>,
): Violation | null {
  if (range(value)) {
    return null;
  }
  const extendedDetails = { ...details };
  if (range.desc) {
    extendedDetails.expected = range.desc;
  }
  if (extendedDetails.value === undefined) {
    extendedDetails.value = value;
  }
  
  return createViolation(constraint, message, extendedDetails);
}

function resolveConstraintSource(rt: RuntimeCtx, source: ConstraintSource): Constraint[] {
  if (Array.isArray(source)) {
    return source.flatMap(s => resolveConstraintSource(rt, s));
  }
  if (typeof source === 'function') {
    return resolveConstraintSource(rt, source(rt));
  }
  return [source];
}

function prefixViolations(violations: Violation[], prefix: string): Violation[] {
  return violations.map(v => ({
    ...v,
    constraint: `${prefix}.${v.constraint}`,
  }));
}

export function below(a: ElemTarget, b: ElemTarget, range: Range, name?: string): LayoutConstraint {
  return (rt) => {
    const elA = resolveElem(rt, a);
    const elB = resolveElem(rt, b);
    const constraintName = name ?? `below(${elA.name},${elB.name})`;
  return buildConstraint(constraintName, constraintName, () => {
      const diff = elA.top - elB.bottom;
    const violation = evaluateRange(
      range,
      diff,
      constraintName,
        `${elA.name} is not below ${elB.name} within expected range`,
      { diff },
    );
    return violation ? [violation] : [];
  });
  };
}

export function above(a: ElemTarget, b: ElemTarget, range: Range, name?: string): LayoutConstraint {
  return (rt) => {
    const elA = resolveElem(rt, a);
    const elB = resolveElem(rt, b);
    const constraintName = name ?? `above(${elA.name},${elB.name})`;
  return buildConstraint(constraintName, constraintName, () => {
      const diff = elB.top - elA.bottom;
    const violation = evaluateRange(
      range,
      diff,
      constraintName,
        `${elA.name} is not above ${elB.name} within expected range`,
      { diff },
    );
    return violation ? [violation] : [];
  });
  };
}

export function leftOf(a: ElemTarget, b: ElemTarget, range: Range, name?: string): LayoutConstraint {
  return (rt) => {
    const elA = resolveElem(rt, a);
    const elB = resolveElem(rt, b);
    const constraintName = name ?? `leftOf(${elA.name},${elB.name})`;
  return buildConstraint(constraintName, constraintName, () => {
      const diff = elB.left - elA.right;
    const violation = evaluateRange(
      range,
      diff,
      constraintName,
        `${elA.name} is not left of ${elB.name} within expected range`,
      { diff },
    );
    return violation ? [violation] : [];
  });
  };
}

export function rightOf(a: ElemTarget, b: ElemTarget, range: Range, name?: string): LayoutConstraint {
  return (rt) => {
    const elA = resolveElem(rt, a);
    const elB = resolveElem(rt, b);
    const constraintName = name ?? `rightOf(${elA.name},${elB.name})`;
  return buildConstraint(constraintName, constraintName, () => {
      const diff = elA.left - elB.right;
    const violation = evaluateRange(
      range,
      diff,
      constraintName,
        `${elA.name} is not right of ${elB.name} within expected range`,
      { diff },
    );
    return violation ? [violation] : [];
  });
  };
}

export interface NearOptions {
  readonly left?: Range;
  readonly right?: Range;
  readonly top?: Range;
  readonly bottom?: Range;
}

export function near(a: ElemTarget, b: ElemTarget, options: NearOptions, name?: string): LayoutConstraint {
  const hasDirection =
    options.left || options.right || options.top || options.bottom;
  if (!hasDirection) {
    throw new Error('near() requires at least one direction');
  }
  return (rt) => {
    const elA = resolveElem(rt, a);
    const elB = resolveElem(rt, b);
    const constraintName = name ?? `near(${elA.name},${elB.name})`;
    
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];

    const evaluate = (
      range: Range | undefined,
      diff: number,
      label: string,
      message: string,
    ) => {
      if (range) {
        if (diff < 0) {
            violations.push(createViolation(label, `${elA.name} overlaps ${elB.name} on ${message}`, { diff }));
          return;
        }
          const violation = evaluateRange(range, diff, label, `${elA.name} is not near ${elB.name} on ${message}`, {
          diff,
        });
        if (violation) violations.push(violation);
      }
    };

      evaluate(options.left, elA.left - elB.right, `${constraintName}.left`, 'left side');
      evaluate(options.right, elB.left - elA.right, `${constraintName}.right`, 'right side');
      evaluate(options.top, elA.top - elB.bottom, `${constraintName}.top`, 'top side');
      evaluate(options.bottom, elB.top - elA.bottom, `${constraintName}.bottom`, 'bottom side');

    return violations;
  });
  };
}

export interface EdgeRanges {
  readonly top?: Range;
  readonly right?: Range;
  readonly bottom?: Range;
  readonly left?: Range;
}

export function inside(a: ElemTarget, b: ElemTarget, edges?: EdgeRanges, name?: string): LayoutConstraint {
  const hasEdges =
    edges &&
    (edges.left !== undefined ||
      edges.right !== undefined ||
      edges.top !== undefined ||
      edges.bottom !== undefined);
  const resolvedEdges: EdgeRanges =
    edges && hasEdges
      ? edges
      : {
          left: gte(0),
          right: gte(0),
          top: gte(0),
          bottom: gte(0),
        };
  return (rt) => {
    const elA = resolveElem(rt, a);
    const elB = resolveElem(rt, b);
    const constraintName = name ?? `inside(${elA.name},${elB.name})`;

  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];
    if (resolvedEdges.left) {
        const diff = elA.left - elB.left;
      const violation = evaluateRange(
        resolvedEdges.left,
        diff,
        `${constraintName}.left`,
          `${elA.name} left edge is not inside ${elB.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    if (resolvedEdges.right) {
        const diff = elB.right - elA.right;
      const violation = evaluateRange(
        resolvedEdges.right,
        diff,
        `${constraintName}.right`,
          `${elA.name} right edge is not inside ${elB.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    if (resolvedEdges.top) {
        const diff = elA.top - elB.top;
      const violation = evaluateRange(
        resolvedEdges.top,
        diff,
        `${constraintName}.top`,
          `${elA.name} top edge is not inside ${elB.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    if (resolvedEdges.bottom) {
        const diff = elB.bottom - elA.bottom;
      const violation = evaluateRange(
        resolvedEdges.bottom,
        diff,
        `${constraintName}.bottom`,
          `${elA.name} bottom edge is not inside ${elB.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    return violations;
  });
  };
}

export function widthIn(e: ElemTarget, range: Range, name?: string): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `widthIn(${el.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const violation = evaluateRange(
      range,
        el.width,
      constraintName,
        `${el.name} width=${el.width} is out of range`,
        { value: el.width }
    );
    return violation ? [violation] : [];
  });
  };
}

export function heightIn(e: ElemTarget, range: Range, name?: string): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `heightIn(${el.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const violation = evaluateRange(
      range,
        el.height,
      constraintName,
        `${el.name} height=${el.height} is out of range`,
        { value: el.height }
    );
    return violation ? [violation] : [];
  });
  };
}

interface DimensionMatchOptions {
  readonly tolerance?: number;
  readonly ratio?: Range;
}

function dimensionValue(elem: Elem, dimension: 'width' | 'height'): number {
  return dimension === 'width' ? elem.width : elem.height;
}

type EdgeName = 'left' | 'right' | 'top' | 'bottom';

function edgeValue(elem: Elem, edge: EdgeName): number {
  switch (edge) {
    case 'left':
      return elem.left;
    case 'right':
      return elem.right;
    case 'top':
      return elem.top;
    case 'bottom':
      return elem.bottom;
    default:
      return elem.left;
  }
}

function dimensionMatches(
  element: ElemTarget,
  reference: ElemTarget,
  dimension: 'width' | 'height',
  options: DimensionMatchOptions,
  name?: string,
): LayoutConstraint {
  if (!options.tolerance && !options.ratio) {
    throw new Error('dimensionMatches requires either tolerance or ratio range');
  }
  return (rt) => {
    const el = resolveElem(rt, element);
    const ref = resolveElem(rt, reference);
    const constraintName = name ?? `${dimension}Matches(${el.name},${ref.name})`;
    
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];
      const value = dimensionValue(el, dimension);
      const target = dimensionValue(ref, dimension);

    if (options.tolerance !== undefined) {
      const matches = approxRelative(target, options.tolerance)(value);
      if (!matches) {
        violations.push(
          createViolation(`${constraintName}.tolerance`, `${dimension} mismatch within tolerance`, {
            value,
            target,
            tolerance: options.tolerance,
          }),
        );
      }
    }

    if (options.ratio) {
      if (target === 0) {
        if (value !== 0) {
          violations.push(
            createViolation(`${constraintName}.ratio`, `${dimension} ratio denominator is zero`, {
              value,
              target,
            }),
          );
        }
      } else {
        const ratioValue = value / target;
        const violation = evaluateRange(
          options.ratio,
          ratioValue,
          `${constraintName}.ratio`,
          `${dimension} ratio is out of range`,
          { ratio: ratioValue },
        );
        if (violation) violations.push(violation);
      }
    }

    return violations;
  });
  };
}

export function widthMatches(
  element: ElemTarget,
  reference: ElemTarget,
  options: DimensionMatchOptions,
  name?: string,
): LayoutConstraint {
  return dimensionMatches(element, reference, 'width', options, name);
}

export function heightMatches(
  element: ElemTarget,
  reference: ElemTarget,
  options: DimensionMatchOptions,
  name?: string,
): LayoutConstraint {
  return dimensionMatches(element, reference, 'height', options, name);
}

interface OnAxisOptions {
  readonly elementEdge: EdgeName;
  readonly referenceEdge: EdgeName;
  readonly range: Range;
}

export interface OnOptions {
  readonly horizontal?: OnAxisOptions;
  readonly vertical?: OnAxisOptions;
}

export function on(
  element: ElemTarget,
  reference: ElemTarget,
  options: OnOptions,
  name?: string,
): LayoutConstraint {
  if (!options.horizontal && !options.vertical) {
    throw new Error('on() requires horizontal and/or vertical axis configuration');
  }
  if (options.horizontal) {
    if (
      (options.horizontal.elementEdge !== 'left' && options.horizontal.elementEdge !== 'right') ||
      (options.horizontal.referenceEdge !== 'left' && options.horizontal.referenceEdge !== 'right')
    ) {
      throw new Error('Horizontal axis must reference left/right edges');
    }
  }
  if (options.vertical) {
    if (
      (options.vertical.elementEdge !== 'top' && options.vertical.elementEdge !== 'bottom') ||
      (options.vertical.referenceEdge !== 'top' && options.vertical.referenceEdge !== 'bottom')
    ) {
      throw new Error('Vertical axis must reference top/bottom edges');
    }
  }
  
  return (rt) => {
    const el = resolveElem(rt, element);
    const ref = resolveElem(rt, reference);
    const constraintName = name ?? `on(${el.name},${ref.name})`;
    
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];

    const evaluateAxis = (axis: OnAxisOptions | undefined, label: string) => {
      if (!axis) return;
        const from = edgeValue(el, axis.elementEdge);
        const to = edgeValue(ref, axis.referenceEdge);
      const diff = to - from;
      const violation = evaluateRange(
        axis.range,
        diff,
        `${constraintName}.${label}`,
          `${el.name} is not positioned correctly on ${ref.name} (${label})`,
        { diff },
      );
      if (violation) violations.push(violation);
    };

    evaluateAxis(options.horizontal, 'horizontal');
    evaluateAxis(options.vertical, 'vertical');

    return violations;
  });
  };
}

export function ratio(
  a: number,
  b: number,
  expected: number,
  tolerance: number,
  name?: string,
): LayoutConstraint {
  const constraintName = name ?? 'ratio';
  return () => buildConstraint(constraintName, constraintName, () => {
    if (b === 0) {
      return [
        createViolation(
          constraintName,
          'Ratio denominator is zero',
          { a, b, expected, tolerance },
        ),
      ];
    }
    const actual = a / b;
    const deviation = Math.abs(actual - expected);
    if (deviation <= tolerance) {
      return [];
    }
    return [
      createViolation(constraintName, 'Ratio is outside tolerance', {
        actual,
        expected,
        tolerance,
      }),
    ];
  });
}

export function alignedHorizontally(
  elems: GroupTarget,
  tolerance: number,
  name?: string,
): LayoutConstraint {
  return (rt) => {
    const group = resolveGroup(rt, elems);
  const constraintName = name ?? 'alignedHorizontally';
  return buildConstraint(constraintName, constraintName, () => {
      if (group.length <= 1) return [];
      const base = group[0].centerY;
    const violations: Violation[] = [];
      group.forEach((elem, index) => {
      const delta = Math.abs(elem.centerY - base);
      if (delta > tolerance) {
        violations.push(
          createViolation(`${constraintName}[${index}]`, `${elem.name} is misaligned`, {
            delta,
            tolerance,
          }),
        );
      }
    });
    return violations;
  });
  };
}

export function alignedVertically(elems: GroupTarget, tolerance: number, name?: string): LayoutConstraint {
  return (rt) => {
    const group = resolveGroup(rt, elems);
  const constraintName = name ?? 'alignedVertically';
  return buildConstraint(constraintName, constraintName, () => {
      if (group.length <= 1) return [];
      const base = group[0].centerX;
    const violations: Violation[] = [];
      group.forEach((elem, index) => {
      const delta = Math.abs(elem.centerX - base);
      if (delta > tolerance) {
        violations.push(
          createViolation(`${constraintName}[${index}]`, `${elem.name} is misaligned`, {
            delta,
            tolerance,
          }),
        );
      }
    });
    return violations;
  });
  };
}

function alignByEdge(
  elems: GroupTarget,
  extractor: (elem: Elem) => number,
  tolerance: number,
  constraintName: string,
  message: string,
): LayoutConstraint {
  return (rt) => {
    const group = resolveGroup(rt, elems);
  return buildConstraint(constraintName, constraintName, () => {
      if (group.length <= 1) return [];
      const base = extractor(group[0]);
    const violations: Violation[] = [];
      group.forEach((elem, index) => {
      const delta = Math.abs(extractor(elem) - base);
      if (delta > tolerance) {
        violations.push(
          createViolation(`${constraintName}[${index}]`, message.replace('%elem%', elem.name), {
            delta,
            tolerance,
          }),
        );
      }
    });
    return violations;
  });
  };
}

export function alignedHorizontallyTop(
  elems: GroupTarget,
  tolerance: number,
  name?: string,
): LayoutConstraint {
  return alignByEdge(
    elems,
    elem => elem.top,
    tolerance,
    name ?? 'alignedHorizontallyTop',
    '%elem% top edge is misaligned',
  );
}

export function alignedHorizontallyBottom(
  elems: GroupTarget,
  tolerance: number,
  name?: string,
): LayoutConstraint {
  return alignByEdge(
    elems,
    elem => elem.bottom,
    tolerance,
    name ?? 'alignedHorizontallyBottom',
    '%elem% bottom edge is misaligned',
  );
}

export function alignedHorizontallyEdges(
  elems: GroupTarget,
  tolerance: number,
  name?: string,
): LayoutConstraint {
  return (rt) => {
    const group = resolveGroup(rt, elems);
  const constraintName = name ?? 'alignedHorizontallyEdges';
  return buildConstraint(constraintName, constraintName, () => {
      if (group.length <= 1) return [];
      const baseTop = group[0].top;
      const baseBottom = group[0].bottom;
    const violations: Violation[] = [];
      group.forEach((elem, index) => {
      const topDelta = Math.abs(elem.top - baseTop);
      const bottomDelta = Math.abs(elem.bottom - baseBottom);
      if (topDelta > tolerance || bottomDelta > tolerance) {
        violations.push(
          createViolation(`${constraintName}[${index}]`, `${elem.name} edges are misaligned`, {
            topDelta,
            bottomDelta,
            tolerance,
          }),
        );
      }
    });
    return violations;
  });
  };
}

export function alignedVerticallyLeft(
  elems: GroupTarget,
  tolerance: number,
  name?: string,
): LayoutConstraint {
  return alignByEdge(
    elems,
    elem => elem.left,
    tolerance,
    name ?? 'alignedVerticallyLeft',
    '%elem% left edge is misaligned',
  );
}

export function alignedVerticallyRight(
  elems: GroupTarget,
  tolerance: number,
  name?: string,
): LayoutConstraint {
  return alignByEdge(
    elems,
    elem => elem.right,
    tolerance,
    name ?? 'alignedVerticallyRight',
    '%elem% right edge is misaligned',
  );
}

export function alignedVerticallyEdges(
  elems: GroupTarget,
  tolerance: number,
  name?: string,
): LayoutConstraint {
  return (rt) => {
    const group = resolveGroup(rt, elems);
  const constraintName = name ?? 'alignedVerticallyEdges';
  return buildConstraint(constraintName, constraintName, () => {
      if (group.length <= 1) return [];
      const baseLeft = group[0].left;
      const baseRight = group[0].right;
    const violations: Violation[] = [];
      group.forEach((elem, index) => {
      const leftDelta = Math.abs(elem.left - baseLeft);
      const rightDelta = Math.abs(elem.right - baseRight);
      if (leftDelta > tolerance || rightDelta > tolerance) {
        violations.push(
          createViolation(`${constraintName}[${index}]`, `${elem.name} edges are misaligned`, {
            leftDelta,
            rightDelta,
            tolerance,
          }),
        );
      }
    });
    return violations;
  });
  };
}

export function centered(
  a: ElemTarget,
  b: ElemTarget,
  opts: { h?: Range; v?: Range },
  name?: string,
): LayoutConstraint {
  return (rt) => {
    const elA = resolveElem(rt, a);
    const elB = resolveElem(rt, b);
    const constraintName = name ?? `centered(${elA.name},${elB.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];
    if (opts.h) {
        const diff = elA.centerX - elB.centerX;
      const violation = evaluateRange(
        opts.h,
        diff,
        `${constraintName}.horizontal`,
          `${elA.name} is not horizontally centered relative to ${elB.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    if (opts.v) {
        const diff = elA.centerY - elB.centerY;
      const violation = evaluateRange(
        opts.v,
        diff,
        `${constraintName}.vertical`,
          `${elA.name} is not vertically centered relative to ${elB.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    return violations;
  });
  };
}

export function visible(e: ElemTarget, expectVisible: boolean, name?: string): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `visible(${el.name})`;
  return buildConstraint(constraintName, constraintName, () => {
      if (el.visible === expectVisible) return [];
    return [
      createViolation(
        constraintName,
          expectVisible ? `${el.name} is not visible` : `${el.name} should not be visible`,
      ),
    ];
  });
  };
}

export function present(e: ElemTarget, expectPresent: boolean, name?: string): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `present(${el.name})`;
  return buildConstraint(constraintName, constraintName, () => {
      if (el.present === expectPresent) return [];
    return [
      createViolation(
        constraintName,
          expectPresent ? `${el.name} is not present` : `${el.name} should not be present`,
      ),
    ];
  });
  };
}

export function textEquals(e: ElemTarget, expected: string, name?: string): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `textEquals(${el.name})`;
  return buildConstraint(constraintName, constraintName, () => {
      if (el.text === expected) return [];
    return [
        createViolation(constraintName, `${el.name} text mismatch`, {
        expected,
          actual: el.text,
      }),
    ];
  });
  };
}

export function textMatches(e: ElemTarget, re: RegExp | string, name?: string): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `textMatches(${el.name})`;
  const regex = typeof re === 'string' ? new RegExp(re) : re;
  return buildConstraint(constraintName, constraintName, () => {
      if (regex.test(el.text)) return [];
    return [
        createViolation(constraintName, `${el.name} text does not match pattern`, {
        pattern: regex.toString(),
          actual: el.text,
      }),
    ];
  });
  };
}

export function textDoesNotOverflow(e: ElemTarget, name?: string): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `textDoesNotOverflow(${el.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];
      const horizontalOverflow = el.canvas.width - el.box.width;
    if (horizontalOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
      violations.push(
          createViolation(`${constraintName}.horizontal`, `${el.name} text overflows horizontally`, {
          overflow: horizontalOverflow,
        }),
      );
    }
      const verticalOverflow = el.canvas.height - el.box.height;
    if (verticalOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
      violations.push(
          createViolation(`${constraintName}.vertical`, `${el.name} text overflows vertically`, {
          overflow: verticalOverflow,
        }),
      );
    }

      const metrics = el.textMetrics;
    const textRect = metrics?.boundingRect ?? null;
    if (textRect) {
      const leftOverflow = el.left - textRect.left;
      if (leftOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
        violations.push(
          createViolation(
            `${constraintName}.left`,
              `${el.name} text bleeds to the left`,
            { delta: leftOverflow },
          ),
        );
      }

        const rightOverflow = textRect.left + textRect.width - el.right;
      if (rightOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
        violations.push(
          createViolation(
            `${constraintName}.right`,
              `${el.name} text bleeds to the right`,
            { delta: rightOverflow },
          ),
        );
      }

        const topOverflow = el.top - textRect.top;
      if (topOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
        violations.push(
          createViolation(
            `${constraintName}.top`,
              `${el.name} text bleeds above the element`,
            { delta: topOverflow },
          ),
        );
      }

        const bottomOverflow = textRect.top + textRect.height - el.bottom;
      if (bottomOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
        violations.push(
          createViolation(
            `${constraintName}.bottom`,
              `${el.name} text bleeds below the element`,
            { delta: bottomOverflow },
          ),
        );
      }
    }

    return violations;
  });
  };
}

export function textLinesAtMost(e: ElemTarget, maxLines: number, name?: string): LayoutConstraint {
  if (!Number.isInteger(maxLines) || maxLines < 0) {
    throw new Error('textLinesAtMost: maxLines must be a non-negative integer');
  }
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `textLinesAtMost(${el.name},${maxLines})`;
  return buildConstraint(constraintName, constraintName, () => {
      const metrics = el.textMetrics;
    if (!metrics) {
      return [
        createViolation(
          `${constraintName}.metrics`,
          'Text metrics are unavailable for this element',
            { element: el.name },
        ),
      ];
    }
    if (metrics.lineCount <= maxLines) {
      return [];
    }
    return [
        createViolation(constraintName, `${el.name} renders too many text lines`, {
        lineCount: metrics.lineCount,
        maxLines,
      }),
    ];
  });
  };
}

export function singleLineText(e: ElemTarget, name?: string): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `singleLineText(${el.name})`;
    const overflow = textDoesNotOverflow(el, `${constraintName}.overflow`)(rt);
    const maxLines = textLinesAtMost(el, 1, `${constraintName}.maxLines`)(rt);
    
    const c1 = resolveConstraintSource(rt, overflow);
    const c2 = resolveConstraintSource(rt, maxLines);
    
    return buildConstraint(constraintName, constraintName, () => [
      ...c1.flatMap(c => c.check()),
      ...c2.flatMap(c => c.check()),
    ]);
  };
}

export function forAll(
  elems: GroupTarget,
  mk: (e: Elem) => ConstraintSource,
  name?: string,
): LayoutConstraint {
  return rt => {
    const group = resolveGroup(rt, elems);
  const constraintName = name ?? 'forAll';
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];
      group.forEach((elem, index) => {
        const constraints = resolveConstraintSource(rt, mk(elem));
        constraints.forEach(constraint => {
          const result = constraint.check();
          if (result.length) {
            violations.push(...prefixViolations(result, `${constraintName}[${index}].${constraint.name}`));
          }
        });
    });
    return violations;
  });
  };
}

export function exists(
  elems: GroupTarget,
  mk: (e: Elem) => ConstraintSource,
  name?: string,
): LayoutConstraint {
  return rt => {
    const group = resolveGroup(rt, elems);
  const constraintName = name ?? 'exists';
  return buildConstraint(constraintName, constraintName, () => {
    const details: Violation[][] = [];
      for (let index = 0; index < group.length; index += 1) {
        const elem = group[index]!;
        const constraints = resolveConstraintSource(rt, mk(elem));
        const violations: Violation[] = [];
        constraints.forEach(constraint => {
          const result = constraint.check();
          if (result.length) {
            violations.push(...prefixViolations(result, `${constraintName}[${index}].${constraint.name}`));
          }
        });
      if (violations.length === 0) {
        return [];
      }
      details.push(violations);
    }
    return [
      createViolation(
        constraintName,
        'No element satisfied the predicate',
        details.length ? details : undefined,
      ),
    ];
  });
  };
}

export function none(
  elems: GroupTarget,
  mk: (e: Elem) => ConstraintSource,
  name?: string,
): LayoutConstraint {
  return rt => {
    const group = resolveGroup(rt, elems);
  const constraintName = name ?? 'none';
  return buildConstraint(constraintName, constraintName, () => {
      for (let index = 0; index < group.length; index += 1) {
        const elem = group[index]!;
        const constraints = resolveConstraintSource(rt, mk(elem));
        let matchesPredicate = true;
        for (const constraint of constraints) {
          const result = constraint.check();
          if (result.length > 0) {
            matchesPredicate = false;
            break;
          }
        }
        if (matchesPredicate) {
        return [
          createViolation(
            `${constraintName}[${index}]`,
            'Predicate matched but should not',
            { element: elem.name },
          ),
        ];
      }
    }
    return [];
  });
  };
}

export function countIs(elems: GroupTarget, range: Range, name?: string): LayoutConstraint {
  return (rt) => {
    const group = resolveGroup(rt, elems);
  const constraintName = name ?? 'countIs';
  return buildConstraint(constraintName, constraintName, () => {
      const count = group.length;
    const violation = evaluateRange(
      range,
      count,
      constraintName,
      `Group size ${count} is out of range`,
      { value: count }
    );
    return violation ? [violation] : [];
  });
  };
}

export function amountOfVisible(elems: GroupTarget, range: Range, name?: string): LayoutConstraint {
  return (rt) => {
    const group = resolveGroup(rt, elems);
  const constraintName = name ?? 'amountOfVisible';
  return buildConstraint(constraintName, constraintName, () => {
      const count = group.filter(elem => elem.visible).length;
    const violation = evaluateRange(
      range,
      count,
      constraintName,
      `Visible element count ${count} is out of range`,
      { value: count }
    );
    return violation ? [violation] : [];
  });
  };
}

export function pairwise<T>(arr: T[]): [T, T][] {
  const result: [T, T][] = [];
  for (let i = 0; i < arr.length - 1; i += 1) {
    result.push([arr[i]!, arr[i + 1]!]);
  }
  return result;
}

export function windowed<T>(arr: T[], size: number): T[][] {
  if (size <= 0 || arr.length < size) return [];
  const windows: T[][] = [];
  for (let i = 0; i <= arr.length - size; i += 1) {
    windows.push(arr.slice(i, i + size));
  }
  return windows;
}

export function almostSquared(e: ElemTarget, tolerance = 0.1, name = 'almostSquared'): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name;
    return buildConstraint(constraintName, constraintName, () => {
       if (el.height === 0) {
        return [];
       }
       const actual = el.width / el.height;
       const deviation = Math.abs(actual - 1);
       if (deviation <= tolerance) return [];
       return [createViolation(constraintName, 'Not squared', { actual, tolerance })];
    });
  };
}

export function alignedHorizEqualGap(
  items: GroupTarget,
  gapTolerance: number,
  name = 'equalGap',
): LayoutConstraint {
  return (rt) => {
    const group = resolveGroup(rt, items);
  const constraintName = name;
  return buildConstraint(constraintName, constraintName, () => {
      if (group.length <= 2) return [];
      const sorted = [...group].sort((a, b) => a.left - b.left);
    const gaps = pairwise(sorted).map(([left, right]) => right.left - left.right);
    const baseline = gaps[0]!;
    const violations: Violation[] = [];
    gaps.forEach((gap, index) => {
      const delta = Math.abs(gap - baseline);
      if (delta > gapTolerance) {
        const left = sorted[index]!;
        const right = sorted[index + 1]!;
        violations.push(
          createViolation(
            `${constraintName}.gap(${left.name},${right.name})`, 
            `Gap between ${left.name} and ${right.name} differs from baseline`, 
            {
            gap,
            baseline,
            tolerance: gapTolerance,
          }),
        );
      }
    });
    return violations;
  });
  };
}

export function alignedVertEqualGap(
  items: GroupTarget,
  gapTolerance: number,
  name = 'equalGapVertical',
): LayoutConstraint {
  return (rt) => {
    const group = resolveGroup(rt, items);
  const constraintName = name;
  return buildConstraint(constraintName, constraintName, () => {
      if (group.length <= 2) return [];
      const sorted = [...group].sort((a, b) => a.top - b.top);
    const gaps = pairwise(sorted).map(([topItem, bottomItem]) => bottomItem.top - topItem.bottom);
    const baseline = gaps[0]!;
    const violations: Violation[] = [];
    gaps.forEach((gap, index) => {
      const delta = Math.abs(gap - baseline);
      if (delta > gapTolerance) {
        const topItem = sorted[index]!;
        const bottomItem = sorted[index + 1]!;
        violations.push(
          createViolation(
            `${constraintName}.gap(${topItem.name},${bottomItem.name})`, 
            `Gap between ${topItem.name} and ${bottomItem.name} differs from baseline`, 
            {
            gap,
            baseline,
            tolerance: gapTolerance,
          }),
        );
      }
    });
    return violations;
  });
  };
}

export interface TableLayoutOpts {
  readonly columns: number;
  readonly verticalMargin?: Range;
  readonly horizontalMargin?: Range;
}

function groupIntoRows(items: Group): Group[] {
  if (!items.length) return [];
  const sorted = [...items].sort((a, b) => {
    if (a.top === b.top) return a.left - b.left;
    return a.top - b.top;
  });
  const rows: Group[] = [];
  let currentRow: Group = [];
  let currentTop: number | null = null;
  sorted.forEach(item => {
    if (currentTop === null || Math.abs(item.top - currentTop) <= DEFAULT_ROW_TOLERANCE_PX) {
      currentRow.push(item);
      currentTop = currentTop ?? item.top;
    } else {
      rows.push(currentRow);
      currentRow = [item];
      currentTop = item.top;
    }
  });
  if (currentRow.length) {
    rows.push(currentRow);
  }
  return rows;
}

export function tableLayout(items: GroupTarget, opts: TableLayoutOpts, name = 'tableLayout'): LayoutConstraint {
  return (rt) => {
    const group = resolveGroup(rt, items);
  const constraintName = name;
  return buildConstraint(constraintName, constraintName, () => {
      if (!group.length) return [];
      const rows = groupIntoRows(group);
    const violations: Violation[] = [];

    rows.forEach((row, rowIdx) => {
      if (row.length > opts.columns) {
        violations.push(
          createViolation(
            `${constraintName}.columns[row=${rowIdx}]`,
            `Expected <= ${opts.columns} columns, got ${row.length}`,
          ),
        );
      }
      if (opts.horizontalMargin && row.length > 1) {
        const sortedRow = [...row].sort((a, b) => a.left - b.left);
        pairwise(sortedRow).forEach(([left, right], colIdx) => {
          const margin = right.left - left.right;
          const violation = evaluateRange(
            opts.horizontalMargin!,
            margin,
            `${constraintName}.hMargin[row=${rowIdx},col=${colIdx}]`,
            `Horizontal margin between ${left.name} and ${right.name} is out of range`,
            {
              margin,
              left: left.name,
              right: right.name,
              rowIndex: rowIdx,
              gapIndex: colIdx,
            },
          );
          if (violation) violations.push(violation);
        });
      }
    });

    if (opts.verticalMargin && rows.length > 1) {
      for (let i = 0; i < rows.length - 1; i += 1) {
        const currentRow = rows[i]!;
        const nextRow = rows[i + 1]!;
        const bottomElem =
          currentRow.reduce((best, elem) => (elem.bottom > best.bottom ? elem : best), currentRow[0]!);
        const topElem =
          nextRow.reduce((best, elem) => (elem.top < best.top ? elem : best), nextRow[0]!);
        const margin = topElem.top - bottomElem.bottom;
        const violation = evaluateRange(
          opts.verticalMargin,
          margin,
          `${constraintName}.vMargin[row=${i}]`,
          `Vertical margin between ${bottomElem.name} (row ${i}) and ${topElem.name} (row ${i + 1}) is out of range`,
          {
            margin,
            rowAboveIndex: i,
            rowBelowIndex: i + 1,
            aboveElement: bottomElem.name,
            belowElement: topElem.name,
          },
        );
        if (violation) violations.push(violation);
      }
    }

    return violations;
  });
  };
}

const defaultMarginRange: Range = createRange(value => value >= 0, '>= 0');

export function sidesHorizontallyInside(
  items: GroupTarget,
  container: ElemTarget,
  marginRange: Range = defaultMarginRange,
  name = 'sidesHorizontallyInside',
): LayoutConstraint {
  return (rt) => {
    const group = resolveGroup(rt, items);
    const cont = resolveElem(rt, container);
  const constraintName = name;
  return buildConstraint(constraintName, constraintName, () => {
      if (!group.length) return [];
      const sorted = [...group].sort((a, b) => a.left - b.left);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const violations: Violation[] = [];

      const leftMargin = first.left - cont.left;
    const leftViolation = evaluateRange(
      marginRange,
      leftMargin,
      `${constraintName}.first.left`,
      `Left margin of ${first.name} relative to container is out of range`,
      { margin: leftMargin },
    );
    if (leftViolation) violations.push(leftViolation);

      const rightMargin = cont.right - last.right;
    const rightViolation = evaluateRange(
      marginRange,
      rightMargin,
      `${constraintName}.last.right`,
      `Right margin of ${last.name} relative to container is out of range`,
      { margin: rightMargin },
    );
    if (rightViolation) violations.push(rightViolation);

    pairwise(sorted).forEach(([a, b], idx) => {
      if (a.right > b.left) {
        violations.push(
          createViolation(
            `${constraintName}.order[${idx}]`,
            `Item ${a.name} overlaps with ${b.name}`,
            {
              aRight: a.right,
              bLeft: b.left,
            },
          ),
        );
      }
      const topDelta = Math.abs(a.top - b.top);
      if (topDelta > 1) {
        violations.push(
          createViolation(
            `${constraintName}.top[${idx}]`,
            `Items ${a.name} and ${b.name} do not share the same top`,
            { topDelta },
          ),
        );
      }
      const heightDelta = Math.abs(a.height - b.height);
      if (heightDelta > 1) {
        violations.push(
          createViolation(
            `${constraintName}.height[${idx}]`,
            `Items ${a.name} and ${b.name} have different heights`,
            { heightDelta },
          ),
        );
      }
    });

    return violations;
  });
  };
}

type SelectorInput = string | { type: 'css' | 'xpath'; selector: string };

type SelectorKind = 'css' | 'xpath' | 'special';

export interface SelectorDescriptor {
  readonly kind: SelectorKind;
  readonly selector: string;
}

export interface LayoutSpec {
  readonly elements: Record<string, SelectorDescriptor>;
  readonly groups: Record<string, SelectorDescriptor>;
  readonly factories: LayoutConstraint[];
  readonly viewKey: string;
  readonly canvasKey: string;
}

export interface LayoutCtx {
  el(selector: SelectorInput): ElemRef;
  group(selector: SelectorInput): GroupRef;
  readonly view: ElemRef;
  readonly canvas: ElemRef;
  must(...constraints: ConstraintSource[]): void;
}

export interface RuntimeCtx {
  el(ref: ElemRef): Elem;
  group(ref: GroupRef): Group;
  readonly view: Elem;
  readonly canvas: Elem;
  readonly viewportClass: ViewportClass;
}

let selectorIdCounter = 0;

const VIEW_KEY = '__uilint.view';
const CANVAS_KEY = '__uilint.canvas';

function normalizeSelector(selector: SelectorInput): SelectorDescriptor {
  if (typeof selector === 'string') {
    return { kind: 'css', selector };
  }
  return { kind: selector.type, selector: selector.selector };
}

function registerDescriptor(
  registry: Record<string, SelectorDescriptor>,
  prefix: string,
  selector: SelectorInput,
): ElemRef | GroupRef {
  const descriptor = normalizeSelector(selector);
  const key = `${prefix}:${selectorIdCounter += 1}`;
  registry[key] = descriptor;
  return { key };
}

export function defineLayoutSpec(builder: (ctx: LayoutCtx) => void): LayoutSpec {
  const elementDescriptors: Record<string, SelectorDescriptor> = {
    [VIEW_KEY]: { kind: 'special', selector: 'view' },
    [CANVAS_KEY]: { kind: 'special', selector: 'canvas' },
  };
  const groupDescriptors: Record<string, SelectorDescriptor> = {};
  const factories: LayoutConstraint[] = [];

  const ctx: LayoutCtx = {
    el(selector) {
      return registerDescriptor(elementDescriptors, 'el', selector);
    },
    group(selector) {
      return registerDescriptor(groupDescriptors, 'group', selector);
    },
    get view() {
      return { key: VIEW_KEY };
    },
    get canvas() {
      return { key: CANVAS_KEY };
    },
    must(...constraints) {
      const flattened: ConstraintSource[] = [];
      constraints.forEach(entry => {
        if (Array.isArray(entry)) {
          flattened.push(...(entry as ConstraintSource[]));
        } else {
          flattened.push(entry);
        }
      });
      flattened.forEach(constraint => {
        factories.push(() => constraint);
      });
    },
  };

  builder(ctx);

  return {
    elements: elementDescriptors,
    groups: groupDescriptors,
    factories,
    viewKey: VIEW_KEY,
    canvasKey: CANVAS_KEY,
  };
}

export interface LayoutRunOptions {
  readonly viewTag?: string;
  readonly viewportClass?: ViewportClass;
  readonly scenarioName?: string;
  readonly snapshotName?: string;
}

export interface LayoutReport {
  readonly scenarioName: string;
  readonly snapshotName: string;
  readonly viewTag?: string;
  readonly viewSize: { width: number; height: number };
  readonly viewportClass: ViewportClass;
  readonly violations: Violation[];
}

export type SnapshotStore = Record<string, ElemSnapshot[] | undefined>;

export interface SnapshotEvaluationOptions extends LayoutRunOptions {
  readonly view: ElemSnapshot;
  readonly canvas?: ElemSnapshot;
  readonly viewportClass?: ViewportClass;
}

const emptyFrame = (): FrameRect => ({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
});

function createPlaceholderSnapshot(
  descriptor: SelectorDescriptor | undefined,
  key: string,
): ElemSnapshot {
  return {
    selector: descriptor?.selector ?? key,
    box: emptyFrame(),
    view: emptyFrame(),
    canvas: emptyFrame(),
    visible: false,
    present: false,
    text: '',
  };
}

function createElemName(descriptor: SelectorDescriptor | undefined, key: string, index?: number): string {
  const base = descriptor?.selector ?? key;
  return typeof index === 'number' ? `${base}[${index}]` : base;
}

export function evaluateLayoutSpecOnSnapshots(
  spec: LayoutSpec,
  snapshots: SnapshotStore,
  options: SnapshotEvaluationOptions,
): LayoutReport {
  const elementCache = new Map<string, Elem>();
  const groupCache = new Map<string, Group>();

  const viewElem = createElem({ name: 'view', snapshot: options.view });
  const canvasElem = createElem({
    name: 'canvas',
    snapshot: options.canvas ?? options.view,
  });

  const resolveElement = (ref: ElemRef): Elem => {
    if (ref.key === spec.viewKey) return viewElem;
    if (ref.key === spec.canvasKey) return canvasElem;

    const cached = elementCache.get(ref.key);
    if (cached) return cached;

    const descriptor = spec.elements[ref.key];
    const available = snapshots[ref.key];
    const snapshot =
      available && available.length ? available[0]! : createPlaceholderSnapshot(descriptor, ref.key);

    const elem = createElem({
      name: createElemName(descriptor, ref.key),
      snapshot,
    });
    elementCache.set(ref.key, elem);
    return elem;
  };

  const resolveGroup = (ref: GroupRef): Group => {
    const cached = groupCache.get(ref.key);
    if (cached) return cached;

    const descriptor = spec.groups[ref.key];
    const available = snapshots[ref.key];
    if (!available || !available.length) {
      groupCache.set(ref.key, []);
      return [];
    }
    const elems = available.map((snapshot, index) =>
      createElem({ name: createElemName(descriptor, ref.key, index), snapshot }),
    );
    groupCache.set(ref.key, elems);
    return elems;
  };

  const resolvedViewportClass = options.viewportClass ?? classifyViewport(options.view.view.width);

  const runtimeCtx: RuntimeCtx = {
    el: resolveElement,
    group: resolveGroup,
    get view() {
      return viewElem;
    },
    get canvas() {
      return canvasElem;
    },
    get viewportClass() {
      return resolvedViewportClass;
    },
  };

  const violations: Violation[] = [];
  spec.factories.forEach(factory => {
    const constraints = resolveConstraintSource(runtimeCtx, factory(runtimeCtx));
    constraints.forEach(constraint => {
      const result = constraint.check();
      if (result.length) {
        violations.push(...result);
      }
    });
  });

  return {
    scenarioName: options.scenarioName ?? 'unknown',
    snapshotName: options.snapshotName ?? 'unknown',
    viewTag: options.viewTag,
    viewSize: {
      width: options.view.view.width,
      height: options.view.view.height,
    },
    viewportClass: resolvedViewportClass,
    violations,
  };
}
