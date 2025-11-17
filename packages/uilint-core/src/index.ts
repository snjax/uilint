export * from './types.js';
export * from './ranges.js';
export * from './primitives.js';
export * from './combinators.js';
export * from './extras.js';
export * from './spec.js';
export * from './runtime.js';
/**
 * Snapshot of a DOM element captured by the Playwright runtime.
 * Mirrors the structure defined in the PRD.
 */
export interface ElemSnapshot {
  readonly selector: string;
  readonly index?: number;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
  readonly visible: boolean;
  readonly present: boolean;
  readonly text: string;
  readonly meta?: Record<string, unknown>;
}

/**
 * Runtime representation of an element that exposes convenient getters and
 * never talks to the browser directly.
 */
export interface Elem {
  readonly name: string;
  readonly snap: ElemSnapshot;

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

class ElemImpl implements Elem {
  public readonly name: string;
  public readonly snap: ElemSnapshot;
  private readonly childResolver?: (key: string) => Elem | undefined;

  constructor(options: ElemFactoryOptions) {
    this.name = options.name;
    this.snap = options.snapshot;
    this.childResolver = options.findChild;
  }

  public get left(): number {
    return this.snap.left;
  }

  public get top(): number {
    return this.snap.top;
  }

  public get right(): number {
    return this.snap.right;
  }

  public get bottom(): number {
    return this.snap.bottom;
  }

  public get width(): number {
    return this.snap.width;
  }

  public get height(): number {
    return this.snap.height;
  }

  public get centerX(): number {
    return this.snap.left + this.snap.width / 2;
  }

  public get centerY(): number {
    return this.snap.top + this.snap.height / 2;
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

export interface EdgeRanges {
  readonly top?: Range;
  readonly right?: Range;
  readonly bottom?: Range;
  readonly left?: Range;
}

export function inside(a: Elem, b: Elem, edges: EdgeRanges, name?: string): Constraint {
  const constraintName = name ?? `inside(${a.name},${b.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];
    if (edges.left) {
      const diff = a.left - b.left;
      const violation = evaluateRange(
        edges.left,
        diff,
        `${constraintName}.left`,
        `${a.name} left edge is not inside ${b.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    if (edges.right) {
      const diff = b.right - a.right;
      const violation = evaluateRange(
        edges.right,
        diff,
        `${constraintName}.right`,
        `${a.name} right edge is not inside ${b.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    if (edges.top) {
      const diff = a.top - b.top;
      const violation = evaluateRange(
        edges.top,
        diff,
        `${constraintName}.top`,
        `${a.name} top edge is not inside ${b.name}`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    if (edges.bottom) {
      const diff = b.bottom - a.bottom;
      const violation = evaluateRange(
        edges.bottom,
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
  readonly viewportKey: string;
  readonly screenKey: string;
}

export interface LayoutCtx {
  el(selector: SelectorInput): ElemRef;
  group(selector: SelectorInput): GroupRef;
  readonly viewport: ElemRef;
  readonly screen: ElemRef;
  must(...constraints: (Constraint | Constraint[])[]): void;
  mustRef(factory: ConstraintFactory): void;
}

export interface RuntimeCtx {
  el(ref: ElemRef): Elem;
  group(ref: GroupRef): Group;
  readonly viewport: Elem;
  readonly screen: Elem;
}

let selectorIdCounter = 0;

const VIEWPORT_KEY = '__uilint.viewport';
const SCREEN_KEY = '__uilint.screen';

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
    [VIEWPORT_KEY]: { kind: 'special', selector: 'viewport' },
    [SCREEN_KEY]: { kind: 'special', selector: 'screen' },
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
    get viewport() {
      return { key: VIEWPORT_KEY };
    },
    get screen() {
      return { key: SCREEN_KEY };
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
    viewportKey: VIEWPORT_KEY,
    screenKey: SCREEN_KEY,
  };
}

export interface LayoutRunOptions {
  readonly viewportTag?: string;
}

export interface LayoutReport {
  readonly specName: string;
  readonly viewportTag?: string;
  readonly viewportSize: { width: number; height: number };
  readonly violations: Violation[];
}

export type SnapshotStore = Record<string, ElemSnapshot[] | undefined>;

export interface SnapshotEvaluationOptions extends LayoutRunOptions {
  readonly viewport: ElemSnapshot;
  readonly screen?: ElemSnapshot;
}

function createPlaceholderSnapshot(
  descriptor: SelectorDescriptor | undefined,
  key: string,
): ElemSnapshot {
  return {
    selector: descriptor?.selector ?? key,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
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

  const viewportElem = createElem({ name: 'viewport', snapshot: options.viewport });
  const screenElem = createElem({
    name: 'screen',
    snapshot: options.screen ?? options.viewport,
  });

  const resolveElement = (ref: ElemRef): Elem => {
    if (ref.key === spec.viewportKey) return viewportElem;
    if (ref.key === spec.screenKey) return screenElem;

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
    get viewport() {
      return viewportElem;
    },
    get screen() {
      return screenElem;
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
    viewportTag: options.viewportTag,
    viewportSize: {
      width: options.viewport.width,
      height: options.viewport.height,
    },
    violations,
  };
}

