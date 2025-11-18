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

export type Range = (value: number) => boolean;

/** Matches values that are exactly equal to the target. */
export const eq = (target: number): Range => value => value === target;

/** Matches values strictly greater than the target. */
export const gt = (target: number): Range => value => value > target;

/** Matches values greater than or equal to the target. */
export const gte = (target: number): Range => value => value >= target;

/** Matches values strictly less than the target. */
export const lt = (target: number): Range => value => value < target;

/** Matches values less than or equal to the target. */
export const lte = (target: number): Range => value => value <= target;

/** Matches values that fall within the inclusive [min, max] interval. */
export const between = (min: number, max: number): Range => value => value >= min && value <= max;

/**
 * Matches values that are approximately equal to the expected number,
 * allowing a symmetric tolerance.
 */
export const approx = (expected: number, tolerance: number): Range => value =>
  Math.abs(value - expected) <= tolerance;

/** Matches any numeric value. */
export const anyRange: Range = () => true;

/**
 * @notice Range helper that checks equality within a relative tolerance.
 * @param expected Baseline value to compare with.
 * @param tolerance Relative tolerance expressed as fraction (0.05 = 5%).
 */
export const approxRelative = (expected: number, tolerance: number): Range => {
  if (tolerance < 0) {
    throw new Error('Tolerance must be non-negative');
  }
  return value => {
    const delta = Math.abs(value - expected);
    const maxMagnitude = Math.max(Math.abs(value), Math.abs(expected));
    if (maxMagnitude === 0) {
      return delta === 0;
    }
    return delta <= tolerance * maxMagnitude;
  };
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
  return range(value) ? null : createViolation(constraint, message, { value, ...details });
}

function flattenConstraints(constraints: Constraint | Constraint[]): Constraint[] {
  return Array.isArray(constraints) ? constraints : [constraints];
}

function prefixViolations(violations: Violation[], prefix: string): Violation[] {
  return violations.map(v => ({
    ...v,
    constraint: `${prefix}.${v.constraint}`,
  }));
}

export function below(a: Elem, b: Elem, range: Range, name?: string): Constraint {
  const constraintName = name ?? `below(${a.name},${b.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const diff = a.top - b.bottom;
    const violation = evaluateRange(
      range,
      diff,
      constraintName,
      `${a.name} is not below ${b.name} within expected range`,
      { diff },
    );
    return violation ? [violation] : [];
  });
}

export function above(a: Elem, b: Elem, range: Range, name?: string): Constraint {
  const constraintName = name ?? `above(${a.name},${b.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const diff = b.top - a.bottom;
    const violation = evaluateRange(
      range,
      diff,
      constraintName,
      `${a.name} is not above ${b.name} within expected range`,
      { diff },
    );
    return violation ? [violation] : [];
  });
}

export function leftOf(a: Elem, b: Elem, range: Range, name?: string): Constraint {
  const constraintName = name ?? `leftOf(${a.name},${b.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const diff = b.left - a.right;
    const violation = evaluateRange(
      range,
      diff,
      constraintName,
      `${a.name} is not left of ${b.name} within expected range`,
      { diff },
    );
    return violation ? [violation] : [];
  });
}

export function rightOf(a: Elem, b: Elem, range: Range, name?: string): Constraint {
  const constraintName = name ?? `rightOf(${a.name},${b.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const diff = a.left - b.right;
    const violation = evaluateRange(
      range,
      diff,
      constraintName,
      `${a.name} is not right of ${b.name} within expected range`,
      { diff },
    );
    return violation ? [violation] : [];
  });
}

export interface NearOptions {
  readonly left?: Range;
  readonly right?: Range;
  readonly top?: Range;
  readonly bottom?: Range;
}

export function near(a: Elem, b: Elem, options: NearOptions, name?: string): Constraint {
  const constraintName = name ?? `near(${a.name},${b.name})`;
  const hasDirection =
    options.left || options.right || options.top || options.bottom;
  if (!hasDirection) {
    throw new Error('near() requires at least one direction');
  }
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
          violations.push(createViolation(label, `${a.name} overlaps ${b.name} on ${message}`, { diff }));
          return;
        }
        const violation = evaluateRange(range, diff, label, `${a.name} is not near ${b.name} on ${message}`, {
          diff,
        });
        if (violation) violations.push(violation);
      }
    };

    evaluate(options.left, a.left - b.right, `${constraintName}.left`, 'left side');
    evaluate(options.right, b.left - a.right, `${constraintName}.right`, 'right side');
    evaluate(options.top, a.top - b.bottom, `${constraintName}.top`, 'top side');
    evaluate(options.bottom, b.top - a.bottom, `${constraintName}.bottom`, 'bottom side');

    return violations;
  });
}

export interface EdgeRanges {
  readonly top?: Range;
  readonly right?: Range;
  readonly bottom?: Range;
  readonly left?: Range;
}

export function inside(a: Elem, b: Elem, edges?: EdgeRanges, name?: string): Constraint {
  const constraintName = name ?? `inside(${a.name},${b.name})`;
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
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];
    if (resolvedEdges.left) {
      const diff = a.left - b.left;
      const violation = evaluateRange(
        resolvedEdges.left,
        diff,
        `${constraintName}.left`,
        `${a.name} left edge is not inside ${b.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    if (resolvedEdges.right) {
      const diff = b.right - a.right;
      const violation = evaluateRange(
        resolvedEdges.right,
        diff,
        `${constraintName}.right`,
        `${a.name} right edge is not inside ${b.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    if (resolvedEdges.top) {
      const diff = a.top - b.top;
      const violation = evaluateRange(
        resolvedEdges.top,
        diff,
        `${constraintName}.top`,
        `${a.name} top edge is not inside ${b.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    if (resolvedEdges.bottom) {
      const diff = b.bottom - a.bottom;
      const violation = evaluateRange(
        resolvedEdges.bottom,
        diff,
        `${constraintName}.bottom`,
        `${a.name} bottom edge is not inside ${b.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    return violations;
  });
}

export function widthIn(e: Elem, range: Range, name?: string): Constraint {
  const constraintName = name ?? `widthIn(${e.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const violation = evaluateRange(
      range,
      e.width,
      constraintName,
      `${e.name} width=${e.width} is out of range`,
    );
    return violation ? [violation] : [];
  });
}

export function heightIn(e: Elem, range: Range, name?: string): Constraint {
  const constraintName = name ?? `heightIn(${e.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const violation = evaluateRange(
      range,
      e.height,
      constraintName,
      `${e.name} height=${e.height} is out of range`,
    );
    return violation ? [violation] : [];
  });
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
  element: Elem,
  reference: Elem,
  dimension: 'width' | 'height',
  options: DimensionMatchOptions,
  name?: string,
): Constraint {
  const constraintName = name ?? `${dimension}Matches(${element.name},${reference.name})`;
  if (!options.tolerance && !options.ratio) {
    throw new Error('dimensionMatches requires either tolerance or ratio range');
  }
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];
    const value = dimensionValue(element, dimension);
    const target = dimensionValue(reference, dimension);

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
}

export function widthMatches(
  element: Elem,
  reference: Elem,
  options: DimensionMatchOptions,
  name?: string,
): Constraint {
  return dimensionMatches(element, reference, 'width', options, name);
}

export function heightMatches(
  element: Elem,
  reference: Elem,
  options: DimensionMatchOptions,
  name?: string,
): Constraint {
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
  element: Elem,
  reference: Elem,
  options: OnOptions,
  name?: string,
): Constraint {
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
  const constraintName = name ?? `on(${element.name},${reference.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];

    const evaluateAxis = (axis: OnAxisOptions | undefined, label: string) => {
      if (!axis) return;
      const from = edgeValue(element, axis.elementEdge);
      const to = edgeValue(reference, axis.referenceEdge);
      const diff = to - from;
      const violation = evaluateRange(
        axis.range,
        diff,
        `${constraintName}.${label}`,
        `${element.name} is not positioned correctly on ${reference.name} (${label})`,
        { diff },
      );
      if (violation) violations.push(violation);
    };

    evaluateAxis(options.horizontal, 'horizontal');
    evaluateAxis(options.vertical, 'vertical');

    return violations;
  });
}

export function ratio(
  a: number,
  b: number,
  expected: number,
  tolerance: number,
  name?: string,
): Constraint {
  const constraintName = name ?? 'ratio';
  return buildConstraint(constraintName, constraintName, () => {
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
  elems: Group,
  tolerance: number,
  name?: string,
): Constraint {
  const constraintName = name ?? 'alignedHorizontally';
  return buildConstraint(constraintName, constraintName, () => {
    if (elems.length <= 1) return [];
    const base = elems[0].centerY;
    const violations: Violation[] = [];
    elems.forEach((elem, index) => {
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
}

export function alignedVertically(elems: Group, tolerance: number, name?: string): Constraint {
  const constraintName = name ?? 'alignedVertically';
  return buildConstraint(constraintName, constraintName, () => {
    if (elems.length <= 1) return [];
    const base = elems[0].centerX;
    const violations: Violation[] = [];
    elems.forEach((elem, index) => {
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
}

function alignByEdge(
  elems: Group,
  extractor: (elem: Elem) => number,
  tolerance: number,
  constraintName: string,
  message: string,
): Constraint {
  return buildConstraint(constraintName, constraintName, () => {
    if (elems.length <= 1) return [];
    const base = extractor(elems[0]);
    const violations: Violation[] = [];
    elems.forEach((elem, index) => {
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
}

export function alignedHorizontallyTop(
  elems: Group,
  tolerance: number,
  name?: string,
): Constraint {
  return alignByEdge(
    elems,
    elem => elem.top,
    tolerance,
    name ?? 'alignedHorizontallyTop',
    '%elem% top edge is misaligned',
  );
}

export function alignedHorizontallyBottom(
  elems: Group,
  tolerance: number,
  name?: string,
): Constraint {
  return alignByEdge(
    elems,
    elem => elem.bottom,
    tolerance,
    name ?? 'alignedHorizontallyBottom',
    '%elem% bottom edge is misaligned',
  );
}

export function alignedHorizontallyEdges(
  elems: Group,
  tolerance: number,
  name?: string,
): Constraint {
  const constraintName = name ?? 'alignedHorizontallyEdges';
  return buildConstraint(constraintName, constraintName, () => {
    if (elems.length <= 1) return [];
    const baseTop = elems[0].top;
    const baseBottom = elems[0].bottom;
    const violations: Violation[] = [];
    elems.forEach((elem, index) => {
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
}

export function alignedVerticallyLeft(
  elems: Group,
  tolerance: number,
  name?: string,
): Constraint {
  return alignByEdge(
    elems,
    elem => elem.left,
    tolerance,
    name ?? 'alignedVerticallyLeft',
    '%elem% left edge is misaligned',
  );
}

export function alignedVerticallyRight(
  elems: Group,
  tolerance: number,
  name?: string,
): Constraint {
  return alignByEdge(
    elems,
    elem => elem.right,
    tolerance,
    name ?? 'alignedVerticallyRight',
    '%elem% right edge is misaligned',
  );
}

export function alignedVerticallyEdges(
  elems: Group,
  tolerance: number,
  name?: string,
): Constraint {
  const constraintName = name ?? 'alignedVerticallyEdges';
  return buildConstraint(constraintName, constraintName, () => {
    if (elems.length <= 1) return [];
    const baseLeft = elems[0].left;
    const baseRight = elems[0].right;
    const violations: Violation[] = [];
    elems.forEach((elem, index) => {
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
}

export function centered(
  a: Elem,
  b: Elem,
  opts: { h?: Range; v?: Range },
  name?: string,
): Constraint {
  const constraintName = name ?? `centered(${a.name},${b.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];
    if (opts.h) {
      const diff = a.centerX - b.centerX;
      const violation = evaluateRange(
        opts.h,
        diff,
        `${constraintName}.horizontal`,
        `${a.name} is not horizontally centered relative to ${b.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    if (opts.v) {
      const diff = a.centerY - b.centerY;
      const violation = evaluateRange(
        opts.v,
        diff,
        `${constraintName}.vertical`,
        `${a.name} is not vertically centered relative to ${b.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    return violations;
  });
}

export function visible(e: Elem, expectVisible: boolean, name?: string): Constraint {
  const constraintName = name ?? `visible(${e.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    if (e.visible === expectVisible) return [];
    return [
      createViolation(
        constraintName,
        expectVisible ? `${e.name} is not visible` : `${e.name} should not be visible`,
      ),
    ];
  });
}

export function present(e: Elem, expectPresent: boolean, name?: string): Constraint {
  const constraintName = name ?? `present(${e.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    if (e.present === expectPresent) return [];
    return [
      createViolation(
        constraintName,
        expectPresent ? `${e.name} is not present` : `${e.name} should not be present`,
      ),
    ];
  });
}

export function textEquals(e: Elem, expected: string, name?: string): Constraint {
  const constraintName = name ?? `textEquals(${e.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    if (e.text === expected) return [];
    return [
      createViolation(constraintName, `${e.name} text mismatch`, {
        expected,
        actual: e.text,
      }),
    ];
  });
}

export function textMatches(e: Elem, re: RegExp | string, name?: string): Constraint {
  const constraintName = name ?? `textMatches(${e.name})`;
  const regex = typeof re === 'string' ? new RegExp(re) : re;
  return buildConstraint(constraintName, constraintName, () => {
    if (regex.test(e.text)) return [];
    return [
      createViolation(constraintName, `${e.name} text does not match pattern`, {
        pattern: regex.toString(),
        actual: e.text,
      }),
    ];
  });
}

export function textDoesNotOverflow(e: Elem, name?: string): Constraint {
  const constraintName = name ?? `textDoesNotOverflow(${e.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];
    const horizontalOverflow = e.canvas.width - e.box.width;
    if (horizontalOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
      violations.push(
        createViolation(`${constraintName}.horizontal`, `${e.name} text overflows horizontally`, {
          overflow: horizontalOverflow,
        }),
      );
    }
    const verticalOverflow = e.canvas.height - e.box.height;
    if (verticalOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
      violations.push(
        createViolation(`${constraintName}.vertical`, `${e.name} text overflows vertically`, {
          overflow: verticalOverflow,
        }),
      );
    }

    const metrics = e.textMetrics;
    const textRect = metrics?.boundingRect ?? null;
    if (textRect) {
      const leftOverflow = e.left - textRect.left;
      if (leftOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
        violations.push(
          createViolation(
            `${constraintName}.left`,
            `${e.name} text bleeds to the left`,
            { delta: leftOverflow },
          ),
        );
      }

      const rightOverflow = textRect.left + textRect.width - e.right;
      if (rightOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
        violations.push(
          createViolation(
            `${constraintName}.right`,
            `${e.name} text bleeds to the right`,
            { delta: rightOverflow },
          ),
        );
      }

      const topOverflow = e.top - textRect.top;
      if (topOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
        violations.push(
          createViolation(
            `${constraintName}.top`,
            `${e.name} text bleeds above the element`,
            { delta: topOverflow },
          ),
        );
      }

      const bottomOverflow = textRect.top + textRect.height - e.bottom;
      if (bottomOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
        violations.push(
          createViolation(
            `${constraintName}.bottom`,
            `${e.name} text bleeds below the element`,
            { delta: bottomOverflow },
          ),
        );
      }
    }

    return violations;
  });
}

export function textLinesAtMost(e: Elem, maxLines: number, name?: string): Constraint {
  if (!Number.isInteger(maxLines) || maxLines < 0) {
    throw new Error('textLinesAtMost: maxLines must be a non-negative integer');
  }
  const constraintName = name ?? `textLinesAtMost(${e.name},${maxLines})`;
  return buildConstraint(constraintName, constraintName, () => {
    const metrics = e.textMetrics;
    if (!metrics) {
      return [
        createViolation(
          `${constraintName}.metrics`,
          'Text metrics are unavailable for this element',
          { element: e.name },
        ),
      ];
    }
    if (metrics.lineCount <= maxLines) {
      return [];
    }
    return [
      createViolation(constraintName, `${e.name} renders too many text lines`, {
        lineCount: metrics.lineCount,
        maxLines,
      }),
    ];
  });
}

export function singleLineText(e: Elem, name?: string): Constraint {
  const constraintName = name ?? `singleLineText(${e.name})`;
  const overflow = textDoesNotOverflow(e, `${constraintName}.overflow`);
  const maxLines = textLinesAtMost(e, 1, `${constraintName}.maxLines`);
  return buildConstraint(constraintName, constraintName, () => [
    ...overflow.check(),
    ...maxLines.check(),
  ]);
}

function evaluateChildConstraints(
  elem: Elem,
  mk: (e: Elem) => Constraint | Constraint[],
  prefix: string,
): Violation[] {
  return flattenConstraints(mk(elem)).flatMap(constraint =>
    prefixViolations(constraint.check(), `${prefix}.${constraint.name}`),
  );
}

export function forAll(
  elems: Group,
  mk: (e: Elem) => Constraint | Constraint[],
  name?: string,
): Constraint {
  const constraintName = name ?? 'forAll';
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];
    elems.forEach((elem, index) => {
      violations.push(...evaluateChildConstraints(elem, mk, `${constraintName}[${index}]`));
    });
    return violations;
  });
}

export function exists(
  elems: Group,
  mk: (e: Elem) => Constraint | Constraint[],
  name?: string,
): Constraint {
  const constraintName = name ?? 'exists';
  return buildConstraint(constraintName, constraintName, () => {
    const details: Violation[][] = [];
    for (let index = 0; index < elems.length; index += 1) {
      const elem = elems[index]!;
      const violations = evaluateChildConstraints(elem, mk, `${constraintName}[${index}]`);
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
}

export function none(
  elems: Group,
  mk: (e: Elem) => Constraint | Constraint[],
  name?: string,
): Constraint {
  const constraintName = name ?? 'none';
  return buildConstraint(constraintName, constraintName, () => {
    for (let index = 0; index < elems.length; index += 1) {
      const elem = elems[index]!;
      const violations = evaluateChildConstraints(elem, mk, `${constraintName}[${index}]`);
      if (violations.length === 0) {
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
}

export function countIs(elems: Group, range: Range, name?: string): Constraint {
  const constraintName = name ?? 'countIs';
  return buildConstraint(constraintName, constraintName, () => {
    const count = elems.length;
    const violation = evaluateRange(
      range,
      count,
      constraintName,
      `Group size ${count} is out of range`,
    );
    return violation ? [violation] : [];
  });
}

export function amountOfVisible(elems: Group, range: Range, name?: string): Constraint {
  const constraintName = name ?? 'amountOfVisible';
  return buildConstraint(constraintName, constraintName, () => {
    const count = elems.filter(elem => elem.visible).length;
    const violation = evaluateRange(
      range,
      count,
      constraintName,
      `Visible element count ${count} is out of range`,
    );
    return violation ? [violation] : [];
  });
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

export function almostSquared(e: Elem, tolerance = 0.1, name = 'almostSquared'): Constraint {
  return ratio(e.width, e.height, 1, tolerance, name);
}

export function alignedHorizEqualGap(
  items: Group,
  gapTolerance: number,
  name = 'equalGap',
): Constraint {
  const constraintName = name;
  return buildConstraint(constraintName, constraintName, () => {
    if (items.length <= 2) return [];
    const sorted = [...items].sort((a, b) => a.left - b.left);
    const gaps = pairwise(sorted).map(([left, right]) => right.left - left.right);
    const baseline = gaps[0]!;
    const violations: Violation[] = [];
    gaps.forEach((gap, index) => {
      const delta = Math.abs(gap - baseline);
      if (delta > gapTolerance) {
        violations.push(
          createViolation(`${constraintName}[${index}]`, 'Gap differs from baseline', {
            gap,
            baseline,
            tolerance: gapTolerance,
          }),
        );
      }
    });
    return violations;
  });
}

export function alignedVertEqualGap(
  items: Group,
  gapTolerance: number,
  name = 'equalGapVertical',
): Constraint {
  const constraintName = name;
  return buildConstraint(constraintName, constraintName, () => {
    if (items.length <= 2) return [];
    const sorted = [...items].sort((a, b) => a.top - b.top);
    const gaps = pairwise(sorted).map(([topItem, bottomItem]) => bottomItem.top - topItem.bottom);
    const baseline = gaps[0]!;
    const violations: Violation[] = [];
    gaps.forEach((gap, index) => {
      const delta = Math.abs(gap - baseline);
      if (delta > gapTolerance) {
        violations.push(
          createViolation(`${constraintName}[${index}]`, 'Gap differs from baseline', {
            gap,
            baseline,
            tolerance: gapTolerance,
          }),
        );
      }
    });
    return violations;
  });
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

export function tableLayout(items: Group, opts: TableLayoutOpts, name = 'tableLayout'): Constraint {
  const constraintName = name;
  return buildConstraint(constraintName, constraintName, () => {
    if (!items.length) return [];
    const rows = groupIntoRows(items);
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
            'Horizontal margin is out of range',
            { margin },
          );
          if (violation) violations.push(violation);
        });
      }
    });

    if (opts.verticalMargin && rows.length > 1) {
      for (let i = 0; i < rows.length - 1; i += 1) {
        const currentRow = rows[i]!;
        const nextRow = rows[i + 1]!;
        const currentBottom = Math.max(...currentRow.map(e => e.bottom));
        const nextTop = Math.min(...nextRow.map(e => e.top));
        const margin = nextTop - currentBottom;
        const violation = evaluateRange(
          opts.verticalMargin,
          margin,
          `${constraintName}.vMargin[row=${i}]`,
          'Vertical margin is out of range',
          { margin },
        );
        if (violation) violations.push(violation);
      }
    }

    return violations;
  });
}

const defaultMarginRange: Range = value => value >= 0;

export function sidesHorizontallyInside(
  items: Group,
  container: Elem,
  marginRange: Range = defaultMarginRange,
  name = 'sidesHorizontallyInside',
): Constraint {
  const constraintName = name;
  return buildConstraint(constraintName, constraintName, () => {
    if (!items.length) return [];
    const sorted = [...items].sort((a, b) => a.left - b.left);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const violations: Violation[] = [];

    const leftMargin = first.left - container.left;
    const leftViolation = evaluateRange(
      marginRange,
      leftMargin,
      `${constraintName}.first.left`,
      'Left margin is out of range',
      { margin: leftMargin },
    );
    if (leftViolation) violations.push(leftViolation);

    const rightMargin = container.right - last.right;
    const rightViolation = evaluateRange(
      marginRange,
      rightMargin,
      `${constraintName}.last.right`,
      'Right margin is out of range',
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
}

type SelectorInput = string | { type: 'css' | 'xpath'; selector: string };

type SelectorKind = 'css' | 'xpath' | 'special';

export interface SelectorDescriptor {
  readonly kind: SelectorKind;
  readonly selector: string;
}

export interface ElemRef {
  readonly key: string;
}

export interface GroupRef {
  readonly key: string;
}

type ConstraintFactory = (rt: RuntimeCtx) => Constraint | Constraint[];

export interface LayoutSpec {
  readonly name: string;
  readonly elements: Record<string, SelectorDescriptor>;
  readonly groups: Record<string, SelectorDescriptor>;
  readonly factories: ConstraintFactory[];
  readonly viewKey: string;
  readonly canvasKey: string;
}

export interface LayoutCtx {
  el(selector: SelectorInput): ElemRef;
  group(selector: SelectorInput): GroupRef;
  readonly view: ElemRef;
  readonly canvas: ElemRef;
  must(...constraints: (Constraint | Constraint[])[]): void;
  mustRef(factory: ConstraintFactory): void;
}

export interface RuntimeCtx {
  el(ref: ElemRef): Elem;
  group(ref: GroupRef): Group;
  readonly view: Elem;
  readonly canvas: Elem;
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

export function defineLayoutSpec(name: string, builder: (ctx: LayoutCtx) => void): LayoutSpec {
  const elementDescriptors: Record<string, SelectorDescriptor> = {
    [VIEW_KEY]: { kind: 'special', selector: 'view' },
    [CANVAS_KEY]: { kind: 'special', selector: 'canvas' },
  };
  const groupDescriptors: Record<string, SelectorDescriptor> = {};
  const factories: ConstraintFactory[] = [];

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
      constraints.flat().forEach(constraint => {
        factories.push(() => constraint);
      });
    },
    mustRef(factory) {
      factories.push(factory);
    },
  };

  builder(ctx);

  return {
    name,
    elements: elementDescriptors,
    groups: groupDescriptors,
    factories,
    viewKey: VIEW_KEY,
    canvasKey: CANVAS_KEY,
  };
}

export interface LayoutRunOptions {
  readonly viewTag?: string;
}

export interface LayoutReport {
  readonly specName: string;
  readonly viewTag?: string;
  readonly viewSize: { width: number; height: number };
  readonly violations: Violation[];
}

export type SnapshotStore = Record<string, ElemSnapshot[] | undefined>;

export interface SnapshotEvaluationOptions extends LayoutRunOptions {
  readonly view: ElemSnapshot;
  readonly canvas?: ElemSnapshot;
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

  const runtimeCtx: RuntimeCtx = {
    el: resolveElement,
    group: resolveGroup,
    get view() {
      return viewElem;
    },
    get canvas() {
      return canvasElem;
    },
  };

  const violations: Violation[] = [];
  spec.factories.forEach(factory => {
    const constraints = flattenConstraints(factory(runtimeCtx));
    constraints.forEach(constraint => {
      const result = constraint.check();
      if (result.length) {
        violations.push(...result);
      }
    });
  });

  return {
    specName: spec.name,
    viewTag: options.viewTag,
    viewSize: {
      width: options.view.view.width,
      height: options.view.view.height,
    },
    violations,
  };
}

