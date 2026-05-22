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
  readonly color?: string;
  readonly backgroundColor?: string;
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
  readonly color?: string;
  readonly backgroundColor?: string;
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

  public get color(): string | undefined {
    return this.snap.color;
  }

  public get backgroundColor(): string | undefined {
    return this.snap.backgroundColor;
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

export interface RGBA {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

interface LabColor {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

function isColorChannel(value: number, max: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= max;
}

function parseAlpha(value: string): number | null {
  const alpha = Number(value.trim());
  return isColorChannel(alpha, 1) ? alpha : null;
}

function parseRgbComponent(value: string): number | null {
  const component = Number(value.trim());
  return isColorChannel(component, 255) ? component : null;
}

/**
 * Parses a small, deterministic subset of CSS colors captured by browser snapshots.
 */
export function parseCssColor(input: string): RGBA | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  if (value.toLowerCase() === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value);
  if (hex) {
    const raw = hex[1]!;
    if (raw.length === 3) {
      return {
        r: parseInt(`${raw[0]}${raw[0]}`, 16),
        g: parseInt(`${raw[1]}${raw[1]}`, 16),
        b: parseInt(`${raw[2]}${raw[2]}`, 16),
        a: 1,
      };
    }

    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
      a: raw.length === 8 ? parseInt(raw.slice(6, 8), 16) / 255 : 1,
    };
  }

  const rgba = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (!rgba) {
    return null;
  }

  const parts = rgba[1]!.split(',').map(part => part.trim());
  const isRgba = value.toLowerCase().startsWith('rgba(');
  if ((!isRgba && parts.length !== 3) || (isRgba && parts.length !== 4)) {
    return null;
  }

  const r = parseRgbComponent(parts[0]!);
  const g = parseRgbComponent(parts[1]!);
  const b = parseRgbComponent(parts[2]!);
  const a = isRgba ? parseAlpha(parts[3]!) : 1;
  if (r === null || g === null || b === null || a === null) {
    return null;
  }

  return { r, g, b, a };
}

function srgbChannelToLinear(value: number): number {
  const normalized = value / 255;
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }
  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function rgbaToLab(color: RGBA): LabColor {
  const linearR = srgbChannelToLinear(color.r);
  const linearG = srgbChannelToLinear(color.g);
  const linearB = srgbChannelToLinear(color.b);

  const x = (0.4124564 * linearR + 0.3575761 * linearG + 0.1804375 * linearB) / 0.95047;
  const y = 0.2126729 * linearR + 0.7151522 * linearG + 0.0721750 * linearB;
  const z = (0.0193339 * linearR + 0.1191920 * linearG + 0.9503041 * linearB) / 1.08883;

  const xyzToLabComponent = (component: number): number => {
    if (component > 216 / 24389) {
      return Math.cbrt(component);
    }
    return (841 / 108) * component + 4 / 29;
  };

  const fx = xyzToLabComponent(x);
  const fy = xyzToLabComponent(y);
  const fz = xyzToLabComponent(z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

const degreesToRadians = (degrees: number): number => degrees * Math.PI / 180;
const radiansToDegrees = (radians: number): number => radians * 180 / Math.PI;

function hueAngleDegrees(a: number, b: number): number {
  if (a === 0 && b === 0) {
    return 0;
  }
  const angle = radiansToDegrees(Math.atan2(b, a));
  return angle >= 0 ? angle : angle + 360;
}

function deltaE2000FromLab(first: LabColor, second: LabColor): number {
  const kL = 1;
  const kC = 1;
  const kH = 1;

  const c1 = Math.hypot(first.a, first.b);
  const c2 = Math.hypot(second.a, second.b);
  const cBar = (c1 + c2) / 2;
  const cBar7 = cBar ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 25 ** 7)));

  const a1Prime = (1 + g) * first.a;
  const a2Prime = (1 + g) * second.a;
  const c1Prime = Math.hypot(a1Prime, first.b);
  const c2Prime = Math.hypot(a2Prime, second.b);
  const h1Prime = hueAngleDegrees(a1Prime, first.b);
  const h2Prime = hueAngleDegrees(a2Prime, second.b);

  const deltaLPrime = second.l - first.l;
  const deltaCPrime = c2Prime - c1Prime;
  let deltaHPrime = 0;
  if (c1Prime !== 0 && c2Prime !== 0) {
    if (Math.abs(h2Prime - h1Prime) <= 180) {
      deltaHPrime = h2Prime - h1Prime;
    } else if (h2Prime <= h1Prime) {
      deltaHPrime = h2Prime - h1Prime + 360;
    } else {
      deltaHPrime = h2Prime - h1Prime - 360;
    }
  }
  const deltaBigHPrime =
    2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(degreesToRadians(deltaHPrime / 2));

  const lBarPrime = (first.l + second.l) / 2;
  const cBarPrime = (c1Prime + c2Prime) / 2;
  let hBarPrime = h1Prime + h2Prime;
  if (c1Prime === 0 || c2Prime === 0) {
    hBarPrime = h1Prime + h2Prime;
  } else if (Math.abs(h1Prime - h2Prime) <= 180) {
    hBarPrime = (h1Prime + h2Prime) / 2;
  } else if (h1Prime + h2Prime < 360) {
    hBarPrime = (h1Prime + h2Prime + 360) / 2;
  } else {
    hBarPrime = (h1Prime + h2Prime - 360) / 2;
  }

  const t =
    1 -
    0.17 * Math.cos(degreesToRadians(hBarPrime - 30)) +
    0.24 * Math.cos(degreesToRadians(2 * hBarPrime)) +
    0.32 * Math.cos(degreesToRadians(3 * hBarPrime + 6)) -
    0.20 * Math.cos(degreesToRadians(4 * hBarPrime - 63));
  const deltaTheta = 30 * Math.exp(-(((hBarPrime - 275) / 25) ** 2));
  const cBarPrime7 = cBarPrime ** 7;
  const rC = 2 * Math.sqrt(cBarPrime7 / (cBarPrime7 + 25 ** 7));
  const sL = 1 + (0.015 * ((lBarPrime - 50) ** 2)) / Math.sqrt(20 + ((lBarPrime - 50) ** 2));
  const sC = 1 + 0.045 * cBarPrime;
  const sH = 1 + 0.015 * cBarPrime * t;
  const rT = -Math.sin(degreesToRadians(2 * deltaTheta)) * rC;

  const lTerm = deltaLPrime / (kL * sL);
  const cTerm = deltaCPrime / (kC * sC);
  const hTerm = deltaBigHPrime / (kH * sH);

  return Math.sqrt(
    lTerm ** 2 +
    cTerm ** 2 +
    hTerm ** 2 +
    rT * cTerm * hTerm,
  );
}

export function deltaE2000(colorA: string, colorB: string): number {
  const parsedA = parseCssColor(colorA);
  if (!parsedA) {
    throw new Error(`Unable to parse CSS color: ${colorA}`);
  }

  const parsedB = parseCssColor(colorB);
  if (!parsedB) {
    throw new Error(`Unable to parse CSS color: ${colorB}`);
  }

  if (parsedA.r === parsedB.r && parsedA.g === parsedB.g && parsedA.b === parsedB.b) {
    return 0;
  }

  return deltaE2000FromLab(rgbaToLab(parsedA), rgbaToLab(parsedB));
}

/**
 * Recommended minimum CIEDE2000 distance between text and its background
 * for comfortable legibility. Heuristic — CIEDE2000 has no standardized
 * text-legibility cutoff; calibrate against your own design system.
 */
export const MIN_TEXT_BG_DISTANCE = 40;

/**
 * Recommended minimum CIEDE2000 distance for two adjacent UI regions or
 * states to read as visually distinct.
 */
export const MIN_ADJACENT_REGION_DISTANCE = 10;

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

/**
 * Checks that element `a` is positioned below element `b`.
 * 
 * Formula: `a.top - b.bottom` must satisfy the given range.
 * A positive value means `a` is below `b` with a gap.
 * 
 * @param a - Element that should be below
 * @param b - Reference element (should be above `a`)
 * @param range - Valid range for the vertical gap (e.g., `between(0, 20)`)
 * @param name - Optional custom constraint name
 */
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
        `Vertical gap (${elA.name}.top - ${elB.name}.bottom) is out of range`,
      { diff },
    );
    return violation ? [violation] : [];
  });
  };
}

/**
 * Checks that element `a` is positioned above element `b`.
 * 
 * Formula: `b.top - a.bottom` must satisfy the given range.
 * A positive value means `a` is above `b` with a gap.
 * 
 * @param a - Element that should be above
 * @param b - Reference element (should be below `a`)
 * @param range - Valid range for the vertical gap
 * @param name - Optional custom constraint name
 */
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
        `Vertical gap (${elB.name}.top - ${elA.name}.bottom) is out of range`,
      { diff },
    );
    return violation ? [violation] : [];
  });
  };
}

/**
 * Checks that element `a` is positioned to the left of element `b`.
 * 
 * Formula: `b.left - a.right` must satisfy the given range.
 * A positive value means `a` is to the left of `b` with a gap.
 * 
 * @param a - Element that should be on the left
 * @param b - Reference element (should be to the right of `a`)
 * @param range - Valid range for the horizontal gap
 * @param name - Optional custom constraint name
 */
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
        `Horizontal gap (${elB.name}.left - ${elA.name}.right) is out of range`,
      { diff },
    );
    return violation ? [violation] : [];
  });
  };
}

/**
 * Checks that element `a` is positioned to the right of element `b`.
 * 
 * Formula: `a.left - b.right` must satisfy the given range.
 * A positive value means `a` is to the right of `b` with a gap.
 * 
 * @param a - Element that should be on the right
 * @param b - Reference element (should be to the left of `a`)
 * @param range - Valid range for the horizontal gap
 * @param name - Optional custom constraint name
 */
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
        `Horizontal gap (${elA.name}.left - ${elB.name}.right) is out of range`,
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

/**
 * Checks that element `a` is near element `b` on specified sides.
 * 
 * Formulas (depending on options):
 * - left: `a.left - b.right` (gap when `a` is to the left of `b`)
 * - right: `b.left - a.right` (gap when `a` is to the right of `b`)
 * - top: `a.top - b.bottom` (gap when `a` is above `b`)
 * - bottom: `b.top - a.bottom` (gap when `a` is below `b`)
 * 
 * Negative values indicate overlap and will fail the constraint.
 * 
 * @param a - Element to check proximity for
 * @param b - Reference element
 * @param options - Ranges for each side to check (at least one required)
 * @param name - Optional custom constraint name
 */
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
            violations.push(createViolation(label, `${elA.name} overlaps ${elB.name} on ${message} (gap < 0)`, { actual: diff, expected: '>= 0' }));
          return;
        }
          const violation = evaluateRange(range, diff, label, `Gap between ${elA.name} and ${elB.name} on ${message} is out of range`, {
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

/**
 * Checks that element `a` is inside element `b` with optional edge constraints.
 * 
 * Formulas:
 * - left: `a.left - b.left` (distance from container's left edge)
 * - right: `b.right - a.right` (distance from container's right edge)
 * - top: `a.top - b.top` (distance from container's top edge)
 * - bottom: `b.bottom - a.bottom` (distance from container's bottom edge)
 * 
 * Default behavior (no edges specified): all edges must be >= 0 (fully contained).
 * 
 * @param a - Element that should be inside
 * @param b - Container element
 * @param edges - Optional edge constraints (defaults to `>= 0` for all)
 * @param name - Optional custom constraint name
 */
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
          `Left edge offset (${elA.name}.left - ${elB.name}.left) is out of range`,
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
          `Right edge offset (${elB.name}.right - ${elA.name}.right) is out of range`,
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
          `Top edge offset (${elA.name}.top - ${elB.name}.top) is out of range`,
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
          `Bottom edge offset (${elB.name}.bottom - ${elA.name}.bottom) is out of range`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    return violations;
  });
  };
}

/**
 * Checks that element's width falls within the specified range.
 * 
 * Formula: `element.width` must satisfy the range.
 * 
 * @param e - Element to check
 * @param range - Valid range for width (e.g., `between(100, 300)`)
 * @param name - Optional custom constraint name
 */
export function widthIn(e: ElemTarget, range: Range, name?: string): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `widthIn(${el.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const violation = evaluateRange(
      range,
        el.width,
      constraintName,
        `${el.name} width is out of range`,
        { value: el.width }
    );
    return violation ? [violation] : [];
  });
  };
}

/**
 * Checks that element's height falls within the specified range.
 * 
 * Formula: `element.height` must satisfy the range.
 * 
 * @param e - Element to check
 * @param range - Valid range for height (e.g., `between(50, 100)`)
 * @param name - Optional custom constraint name
 */
export function heightIn(e: ElemTarget, range: Range, name?: string): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `heightIn(${el.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const violation = evaluateRange(
      range,
        el.height,
      constraintName,
        `${el.name} height is out of range`,
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
          createViolation(`${constraintName}.tolerance`, `Relative ${dimension} difference exceeds tolerance`, {
            actual: value,
            expected: `~= ${target} (±${options.tolerance * 100}%)`,
          }),
        );
      }
    }

    if (options.ratio) {
      if (target === 0) {
        if (value !== 0) {
          violations.push(
            createViolation(`${constraintName}.ratio`, `${dimension} ratio undefined because reference is 0`, {
              actual: value,
              expected: 0,
            }),
          );
        }
      } else {
        const ratioValue = value / target;
        const violation = evaluateRange(
          options.ratio,
          ratioValue,
          `${constraintName}.ratio`,
          `${dimension} ratio (${el.name}.${dimension} / ${ref.name}.${dimension}) is out of range`,
          { ratio: ratioValue },
        );
        if (violation) violations.push(violation);
      }
    }

    return violations;
  });
  };
}

/**
 * Checks that element's width matches reference element's width.
 * 
 * Formulas (depending on options):
 * - tolerance: `|element.width - reference.width| / max(element.width, reference.width) <= tolerance`
 * - ratio: `element.width / reference.width` must satisfy the range
 * 
 * @param element - Element to check
 * @param reference - Reference element to compare against
 * @param options - Either `tolerance` (relative) or `ratio` range required
 * @param name - Optional custom constraint name
 */
export function widthMatches(
  element: ElemTarget,
  reference: ElemTarget,
  options: DimensionMatchOptions,
  name?: string,
): LayoutConstraint {
  return dimensionMatches(element, reference, 'width', options, name);
}

/**
 * Checks that element's height matches reference element's height.
 * 
 * Formulas (depending on options):
 * - tolerance: `|element.height - reference.height| / max(element.height, reference.height) <= tolerance`
 * - ratio: `element.height / reference.height` must satisfy the range
 * 
 * @param element - Element to check
 * @param reference - Reference element to compare against
 * @param options - Either `tolerance` (relative) or `ratio` range required
 * @param name - Optional custom constraint name
 */
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

/**
 * Checks that element is positioned "on" reference with specific edge alignment.
 * 
 * Formula: `reference.edge - element.edge` must satisfy the range for each axis.
 * 
 * Use cases:
 * - Badge on avatar corner: `on(badge, avatar, { horizontal: { elementEdge: 'right', referenceEdge: 'right', range: eq(0) } })`
 * - Tooltip above button: `on(tooltip, button, { vertical: { elementEdge: 'bottom', referenceEdge: 'top', range: eq(0) } })`
 * 
 * @param element - Element to position
 * @param reference - Reference element
 * @param options - Axis configurations (horizontal and/or vertical required)
 * @param name - Optional custom constraint name
 */
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
          `Edge gap (${ref.name}.${axis.referenceEdge} - ${el.name}.${axis.elementEdge}) is out of range (${label})`,
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

/**
 * Checks that a numeric ratio `a/b` equals expected value within tolerance.
 * 
 * Formula: `|a/b - expected| <= tolerance`
 * 
 * Fails if `b == 0` (division by zero).
 * 
 * @param a - Numerator value
 * @param b - Denominator value (must not be 0)
 * @param expected - Expected ratio value
 * @param tolerance - Absolute tolerance for deviation
 * @param name - Optional custom constraint name
 */
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
          'Ratio a/b undefined because b == 0',
          { actual: 'undefined (b=0)', expected: `~= ${expected} (±${tolerance})` },
        ),
      ];
    }
    const actual = a / b;
    const deviation = Math.abs(actual - expected);
    if (deviation <= tolerance) {
      return [];
    }
    return [
      createViolation(constraintName, 'abs(a/b - expected) exceeds tolerance', {
        actual,
        expected: `~= ${expected} (±${tolerance})`,
      }),
    ];
  });
}

/**
 * Checks that elements in a group are horizontally aligned (same vertical center).
 * 
 * Formula: `|element[i].centerY - element[0].centerY| <= tolerance` for all elements.
 * 
 * @param elems - Group of elements to check
 * @param tolerance - Maximum allowed deviation in pixels
 * @param name - Optional custom constraint name
 */
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
          createViolation(`${constraintName}[${index}]`, `${elem.name} centerY delta exceeds tolerance`, {
            actual: delta,
            expected: `<= ${tolerance}`,
          }),
        );
      }
    });
    return violations;
  });
  };
}

/**
 * Checks that elements in a group are vertically aligned (same horizontal center).
 * 
 * Formula: `|element[i].centerX - element[0].centerX| <= tolerance` for all elements.
 * 
 * @param elems - Group of elements to check
 * @param tolerance - Maximum allowed deviation in pixels
 * @param name - Optional custom constraint name
 */
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
          createViolation(`${constraintName}[${index}]`, `${elem.name} centerX delta exceeds tolerance`, {
            actual: delta,
            expected: `<= ${tolerance}`,
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
            actual: delta,
            expected: `<= ${tolerance}`,
          }),
        );
      }
    });
    return violations;
  });
  };
}

/**
 * Checks that elements are aligned by their top edges.
 * 
 * Formula: `|element[i].top - element[0].top| <= tolerance` for all elements.
 * 
 * @param elems - Group of elements to check
 * @param tolerance - Maximum allowed deviation in pixels
 * @param name - Optional custom constraint name
 */
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
    '%elem% top edge delta exceeds tolerance',
  );
}

/**
 * Checks that elements are aligned by their bottom edges.
 * 
 * Formula: `|element[i].bottom - element[0].bottom| <= tolerance` for all elements.
 * 
 * @param elems - Group of elements to check
 * @param tolerance - Maximum allowed deviation in pixels
 * @param name - Optional custom constraint name
 */
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
    '%elem% bottom edge delta exceeds tolerance',
  );
}

/**
 * Checks that elements are aligned by both top AND bottom edges (same height and vertical position).
 * 
 * Formula: `|element[i].top - element[0].top| <= tolerance` AND
 *          `|element[i].bottom - element[0].bottom| <= tolerance` for all elements.
 * 
 * @param elems - Group of elements to check
 * @param tolerance - Maximum allowed deviation in pixels
 * @param name - Optional custom constraint name
 */
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
          createViolation(`${constraintName}[${index}]`, `${elem.name} top/bottom edge deltas exceed tolerance`, {
            actual: `topDelta=${topDelta}, bottomDelta=${bottomDelta}`,
            expected: `<= ${tolerance}`,
          }),
        );
      }
    });
    return violations;
  });
  };
}

/**
 * Checks that elements are aligned by their left edges.
 * 
 * Formula: `|element[i].left - element[0].left| <= tolerance` for all elements.
 * 
 * @param elems - Group of elements to check
 * @param tolerance - Maximum allowed deviation in pixels
 * @param name - Optional custom constraint name
 */
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
    '%elem% left edge delta exceeds tolerance',
  );
}

/**
 * Checks that elements are aligned by their right edges.
 * 
 * Formula: `|element[i].right - element[0].right| <= tolerance` for all elements.
 * 
 * @param elems - Group of elements to check
 * @param tolerance - Maximum allowed deviation in pixels
 * @param name - Optional custom constraint name
 */
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
    '%elem% right edge delta exceeds tolerance',
  );
}

/**
 * Checks that elements are aligned by both left AND right edges (same width and horizontal position).
 * 
 * Formula: `|element[i].left - element[0].left| <= tolerance` AND
 *          `|element[i].right - element[0].right| <= tolerance` for all elements.
 * 
 * @param elems - Group of elements to check
 * @param tolerance - Maximum allowed deviation in pixels
 * @param name - Optional custom constraint name
 */
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
          createViolation(`${constraintName}[${index}]`, `${elem.name} left/right edge deltas exceed tolerance`, {
            actual: `leftDelta=${leftDelta}, rightDelta=${rightDelta}`,
            expected: `<= ${tolerance}`,
          }),
        );
      }
    });
    return violations;
  });
  };
}

export interface NoOverlapOptions {
  readonly tolerance?: number;
}

/**
 * Checks that visible elements in a group do not overlap in the box frame.
 *
 * @param elems - Group of elements to check
 * @param opts - Optional tolerance in px permitted on each axis
 * @param name - Optional custom constraint name
 */
export function noOverlap(elems: GroupTarget, opts?: NoOverlapOptions, name?: string): LayoutConstraint {
  return (rt) => {
    const group = resolveGroup(rt, elems).filter(elem => elem.visible);
    const tolerance = opts?.tolerance ?? 0;
    const constraintName = name ?? 'noOverlap';
    return buildConstraint(constraintName, constraintName, () => {
      const violations: Violation[] = [];
      for (let i = 0; i < group.length; i += 1) {
        const a = group[i]!;
        for (let j = i + 1; j < group.length; j += 1) {
          const b = group[j]!;
          const overlapX =
            Math.min(a.box.left + a.box.width, b.box.left + b.box.width) -
            Math.max(a.box.left, b.box.left);
          const overlapY =
            Math.min(a.box.top + a.box.height, b.box.top + b.box.height) -
            Math.max(a.box.top, b.box.top);
          if (overlapX > tolerance && overlapY > tolerance) {
            violations.push(
              createViolation(`${constraintName}[${i},${j}]`, `${a.name} overlaps ${b.name}`, {
                overlapX,
                overlapY,
                tolerance,
              }),
            );
          }
        }
      }
      return violations;
    });
  };
}

/**
 * Checks that element `a` is centered relative to element `b`.
 * 
 * Formulas:
 * - Horizontal: `a.centerX - b.centerX` must satisfy `opts.h` range
 * - Vertical: `a.centerY - b.centerY` must satisfy `opts.v` range
 * 
 * Common usage: `centered(logo, header, { h: eq(0) })` for horizontal centering.
 * 
 * @param a - Element to check centering for
 * @param b - Reference/container element
 * @param opts - Ranges for horizontal (`h`) and/or vertical (`v`) centering
 * @param name - Optional custom constraint name
 */
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
          `Horizontal center delta (${elA.name}.centerX - ${elB.name}.centerX) is out of range`,
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
          `Vertical center delta (${elA.name}.centerY - ${elB.name}.centerY) is out of range`,
        { diff },
      );
      if (violation) violations.push(violation);
    }
    return violations;
  });
  };
}

export type ColorChannel = 'color' | 'backgroundColor';

export interface ColorDistanceOptions {
  readonly from?: ColorChannel;
  readonly to?: ColorChannel;
}

/**
 * Checks the CIEDE2000 color distance between two captured color channels.
 *
 * Defaults to comparing text color on `a` with background color on `b`.
 */
export function colorDistance(
  a: ElemTarget,
  b: ElemTarget,
  range: Range,
  opts?: ColorDistanceOptions,
  name?: string,
): LayoutConstraint {
  return (rt) => {
    const elA = resolveElem(rt, a);
    const elB = resolveElem(rt, b);
    const from = opts?.from ?? 'color';
    const to = opts?.to ?? 'backgroundColor';
    const constraintName = name ?? `colorDistance(${elA.name},${elB.name})`;

    return buildConstraint(constraintName, constraintName, () => {
      const rawA = elA[from];
      if (!rawA || rawA.trim() === '') {
        return [
          createViolation(
            constraintName,
            `Color channel '${from}' is not available on ${elA.name}`,
            { element: elA.name, channel: from },
          ),
        ];
      }

      const rawB = elB[to];
      if (!rawB || rawB.trim() === '') {
        return [
          createViolation(
            constraintName,
            `Color channel '${to}' is not available on ${elB.name}`,
            { element: elB.name, channel: to },
          ),
        ];
      }

      const parsedA = parseCssColor(rawA);
      if (!parsedA) {
        return [
          createViolation(
            constraintName,
            `Color channel '${from}' on ${elA.name} could not be parsed`,
            { element: elA.name, channel: from, value: rawA },
          ),
        ];
      }

      const parsedB = parseCssColor(rawB);
      if (!parsedB) {
        return [
          createViolation(
            constraintName,
            `Color channel '${to}' on ${elB.name} could not be parsed`,
            { element: elB.name, channel: to, value: rawB },
          ),
        ];
      }

      if (parsedB.a < 1) {
        return [
          createViolation(
            constraintName,
            `Background of ${elB.name} is not opaque (alpha=${parsedB.a}); point the second argument at an element with a solid background-color`,
            { element: elB.name, alpha: parsedB.a },
          ),
        ];
      }

      const distance = deltaE2000(rawA, rawB);
      const violation = evaluateRange(
        range,
        distance,
        constraintName,
        `Color distance between ${elA.name}.${from} and ${elB.name}.${to} is out of range`,
        { value: distance },
      );
      return violation ? [violation] : [];
    });
  };
}

/**
 * Checks that element's visibility matches expected value.
 * 
 * Visibility is determined by CSS properties (display, visibility, opacity)
 * and element dimensions.
 * 
 * @param e - Element to check
 * @param expectVisible - Expected visibility state (true = should be visible)
 * @param name - Optional custom constraint name
 */
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
        { actual: el.visible, expected: expectVisible },
      ),
    ];
  });
  };
}

/**
 * Checks that element's presence in DOM matches expected value.
 * 
 * An element is present if it exists in the DOM (even if hidden).
 * 
 * @param e - Element to check
 * @param expectPresent - Expected presence state (true = should exist in DOM)
 * @param name - Optional custom constraint name
 */
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
        { actual: el.present, expected: expectPresent },
      ),
    ];
  });
  };
}

/**
 * Checks that element's text content exactly equals expected string.
 * 
 * Formula: `element.text === expected`
 * 
 * @param e - Element to check
 * @param expected - Expected text content
 * @param name - Optional custom constraint name
 */
export function textEquals(e: ElemTarget, expected: string, name?: string): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `textEquals(${el.name})`;
  return buildConstraint(constraintName, constraintName, () => {
      if (el.text === expected) return [];
    return [
        createViolation(constraintName, `${el.name} text is not equal to expected`, {
        expected,
          actual: el.text,
      }),
    ];
  });
  };
}

/**
 * Checks that element's text content matches a regular expression pattern.
 * 
 * Formula: `regex.test(element.text) === true`
 * 
 * @param e - Element to check
 * @param re - Regular expression pattern (string or RegExp)
 * @param name - Optional custom constraint name
 */
export function textMatches(e: ElemTarget, re: RegExp | string, name?: string): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `textMatches(${el.name})`;
  const regex = typeof re === 'string' ? new RegExp(re) : re;
  return buildConstraint(constraintName, constraintName, () => {
      if (regex.test(el.text)) return [];
    return [
        createViolation(constraintName, `${el.name} text does not match pattern`, {
        expected: regex.toString(),
          actual: el.text,
      }),
    ];
  });
  };
}

/**
 * Checks that element's text does not overflow its bounding box.
 * 
 * Formulas checked:
 * - Horizontal: `canvas.width - box.width <= tolerance`
 * - Vertical: `canvas.height - box.height <= tolerance`
 * - Left bleed: `element.left - textRect.left <= tolerance`
 * - Right bleed: `textRect.right - element.right <= tolerance`
 * - Top bleed: `element.top - textRect.top <= tolerance`
 * - Bottom bleed: `textRect.bottom - element.bottom <= tolerance`
 * 
 * Tolerance default: 1px.
 * 
 * @param e - Element to check
 * @param name - Optional custom constraint name
 */
export function textDoesNotOverflow(e: ElemTarget, name?: string): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name ?? `textDoesNotOverflow(${el.name})`;
  return buildConstraint(constraintName, constraintName, () => {
    const violations: Violation[] = [];
      const horizontalOverflow = el.canvas.width - el.box.width;
    if (horizontalOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
      violations.push(
          createViolation(`${constraintName}.horizontal`, `${el.name} horizontal text overflow exceeds tolerance`, {
          actual: horizontalOverflow,
          expected: `<= ${TEXT_OVERFLOW_TOLERANCE_PX}`,
        }),
      );
    }
      const verticalOverflow = el.canvas.height - el.box.height;
    if (verticalOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
      violations.push(
          createViolation(`${constraintName}.vertical`, `${el.name} vertical text overflow exceeds tolerance`, {
          actual: verticalOverflow,
          expected: `<= ${TEXT_OVERFLOW_TOLERANCE_PX}`,
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
              `${el.name} left text overflow exceeds tolerance`,
            { actual: leftOverflow, expected: `<= ${TEXT_OVERFLOW_TOLERANCE_PX}` },
          ),
        );
      }

        const rightOverflow = textRect.left + textRect.width - el.right;
      if (rightOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
        violations.push(
          createViolation(
            `${constraintName}.right`,
              `${el.name} right text overflow exceeds tolerance`,
            { actual: rightOverflow, expected: `<= ${TEXT_OVERFLOW_TOLERANCE_PX}` },
          ),
        );
      }

        const topOverflow = el.top - textRect.top;
      if (topOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
        violations.push(
          createViolation(
            `${constraintName}.top`,
              `${el.name} top text overflow exceeds tolerance`,
            { actual: topOverflow, expected: `<= ${TEXT_OVERFLOW_TOLERANCE_PX}` },
          ),
        );
      }

        const bottomOverflow = textRect.top + textRect.height - el.bottom;
      if (bottomOverflow > TEXT_OVERFLOW_TOLERANCE_PX) {
        violations.push(
          createViolation(
            `${constraintName}.bottom`,
              `${el.name} bottom text overflow exceeds tolerance`,
            { actual: bottomOverflow, expected: `<= ${TEXT_OVERFLOW_TOLERANCE_PX}` },
          ),
        );
      }
    }

    return violations;
  });
  };
}

/**
 * Checks that element's text renders in at most N lines.
 * 
 * Formula: `textMetrics.lineCount <= maxLines`
 * 
 * Requires text metrics to be available for the element.
 * 
 * @param e - Element to check
 * @param maxLines - Maximum allowed number of lines
 * @param name - Optional custom constraint name
 */
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
        createViolation(constraintName, `${el.name} lineCount exceeds maxLines`, {
        actual: metrics.lineCount,
        expected: `<= ${maxLines}`,
      }),
    ];
  });
  };
}

/**
 * Composite constraint: text must not overflow AND must fit in single line.
 * 
 * Combines `textDoesNotOverflow` and `textLinesAtMost(1)`.
 * 
 * @param e - Element to check
 * @param name - Optional custom constraint name
 */
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

/**
 * Universal quantifier: all elements in group must satisfy the constraint.
 * 
 * Formula: `∀ element ∈ group: mk(element)` passes.
 * 
 * @param elems - Group of elements
 * @param mk - Factory function that creates constraint(s) for each element
 * @param name - Optional custom constraint name
 */
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

/**
 * Existential quantifier: at least one element in group must satisfy the constraint.
 * 
 * Formula: `∃ element ∈ group: mk(element)` passes.
 * 
 * @param elems - Group of elements
 * @param mk - Factory function that creates constraint(s) for each element
 * @param name - Optional custom constraint name
 */
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

/**
 * Negative quantifier: no element in group should satisfy the constraint.
 * 
 * Formula: `¬∃ element ∈ group: mk(element)` passes.
 * 
 * @param elems - Group of elements
 * @param mk - Factory function that creates constraint(s) for each element
 * @param name - Optional custom constraint name
 */
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
            'Element matched predicate but none expected',
            { element: elem.name },
          ),
        ];
      }
    }
    return [];
  });
  };
}

/**
 * Checks that the number of elements in group falls within specified range.
 * 
 * Formula: `group.length` must satisfy the range.
 * 
 * @param elems - Group of elements
 * @param range - Valid range for count (e.g., `between(3, 5)`, `eq(4)`)
 * @param name - Optional custom constraint name
 */
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
      'Group size is out of range',
      { value: count }
    );
    return violation ? [violation] : [];
  });
  };
}

/**
 * Checks that the number of visible elements in group falls within specified range.
 * 
 * Formula: `group.filter(e => e.visible).length` must satisfy the range.
 * 
 * @param elems - Group of elements
 * @param range - Valid range for visible count
 * @param name - Optional custom constraint name
 */
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
      'Visible element count is out of range',
      { value: count }
    );
    return violation ? [violation] : [];
  });
  };
}

/**
 * Utility: creates pairs of adjacent elements from array.
 * 
 * Example: `[a, b, c]` → `[[a, b], [b, c]]`
 * 
 * @param arr - Input array
 * @returns Array of adjacent pairs
 */
export function pairwise<T>(arr: T[]): [T, T][] {
  const result: [T, T][] = [];
  for (let i = 0; i < arr.length - 1; i += 1) {
    result.push([arr[i]!, arr[i + 1]!]);
  }
  return result;
}

/**
 * Utility: creates sliding windows of specified size from array.
 * 
 * Example: `windowed([a, b, c, d], 2)` → `[[a, b], [b, c], [c, d]]`
 * 
 * @param arr - Input array
 * @param size - Window size
 * @returns Array of windows
 */
export function windowed<T>(arr: T[], size: number): T[][] {
  if (size <= 0 || arr.length < size) return [];
  const windows: T[][] = [];
  for (let i = 0; i <= arr.length - size; i += 1) {
    windows.push(arr.slice(i, i + size));
  }
  return windows;
}

/**
 * Checks that element's aspect ratio is approximately 1:1 (square).
 * 
 * Formula: `2 * |width - height| / (width + height) <= tolerance`
 * 
 * This symmetric formula treats width and height equally (no division bias).
 * Result is 0 for perfect square, approaches 2 for extreme aspect ratios.
 * 
 * Default tolerance: 0.1 (10% relative difference allowed).
 * 
 * @param e - Element to check
 * @param tolerance - Maximum allowed symmetric deviation (default: 0.1)
 * @param name - Optional custom constraint name
 */
export function almostSquared(e: ElemTarget, tolerance = 0.1, name = 'almostSquared'): LayoutConstraint {
  return (rt) => {
    const el = resolveElem(rt, e);
    const constraintName = name;
    return buildConstraint(constraintName, constraintName, () => {
       const sum = el.width + el.height;
       if (sum === 0) {
        return [];
       }
       const deviation = 2 * Math.abs(el.width - el.height) / sum;
       if (deviation <= tolerance) return [];
       return [createViolation(constraintName, `2*|width-height|/(width+height) exceeds tolerance`, { 
         actual: deviation, 
         width: el.width, 
         height: el.height, 
         expected: `<= ${tolerance}` 
       })];
    });
  };
}

/**
 * Checks that horizontal gaps between adjacent elements are equal.
 * 
 * Formula: `|gap[i] - gap[0]| <= gapTolerance` for all gaps,
 * where `gap = next.left - current.right`.
 * 
 * Elements are sorted by left edge before checking.
 * 
 * @param items - Group of horizontally arranged elements
 * @param gapTolerance - Maximum allowed deviation between gaps
 * @param name - Optional custom constraint name
 */
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
            `Gap delta between ${left.name} and ${right.name} exceeds tolerance`, 
            {
            actual: gap,
            expected: `~= ${baseline} (±${gapTolerance})`,
          }),
        );
      }
    });
    return violations;
  });
  };
}

/**
 * Checks that vertical gaps between adjacent elements are equal.
 * 
 * Formula: `|gap[i] - gap[0]| <= gapTolerance` for all gaps,
 * where `gap = next.top - current.bottom`.
 * 
 * Elements are sorted by top edge before checking.
 * 
 * @param items - Group of vertically arranged elements
 * @param gapTolerance - Maximum allowed deviation between gaps
 * @param name - Optional custom constraint name
 */
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
            `Gap delta between ${topItem.name} and ${bottomItem.name} exceeds tolerance`, 
            {
            actual: gap,
            expected: `~= ${baseline} (±${gapTolerance})`,
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

/**
 * Checks that elements are arranged in a table/grid layout.
 * 
 * Validates:
 * - Each row has at most `opts.columns` elements
 * - Horizontal margins between adjacent cells satisfy `opts.horizontalMargin`
 * - Vertical margins between rows satisfy `opts.verticalMargin`
 * 
 * Elements are automatically grouped into rows by vertical position.
 * 
 * @param items - Group of elements in the grid
 * @param opts - Table layout options (columns, margins)
 * @param name - Optional custom constraint name
 */
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
            `Row ${rowIdx} has more than ${opts.columns} columns`,
            { actual: row.length, expected: `<= ${opts.columns}` },
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
            `Horizontal gap (${left.name}.right -> ${right.name}.left) is out of range`,
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
          `Vertical gap (${bottomElem.name}.bottom -> ${topElem.name}.top) is out of range`,
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

/**
 * Checks that a horizontal row of items is properly contained within a container.
 * 
 * Validates:
 * - Left margin: `first.left - container.left` satisfies `marginRange`
 * - Right margin: `container.right - last.right` satisfies `marginRange`
 * - No overlaps: `current.right <= next.left` for adjacent items
 * - Same top: `|a.top - b.top| <= 1` for adjacent items
 * - Same height: `|a.height - b.height| <= 1` for adjacent items
 * 
 * @param items - Group of horizontally arranged elements
 * @param container - Container element
 * @param marginRange - Valid range for left/right margins (default: >= 0)
 * @param name - Optional custom constraint name
 */
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
            `Order violation: ${a.name}.right exceeds ${b.name}.left`,
            {
              actual: `${a.name}.right(${a.right}) > ${b.name}.left(${b.left})`,
              expected: 'no overlap',
            },
          ),
        );
      }
      const topDelta = Math.abs(a.top - b.top);
      if (topDelta > 1) {
        violations.push(
          createViolation(
            `${constraintName}.top[${idx}]`,
            `Top edge delta between ${a.name} and ${b.name} exceeds 1px`,
            { actual: topDelta, expected: '<= 1' },
          ),
        );
      }
      const heightDelta = Math.abs(a.height - b.height);
      if (heightDelta > 1) {
        violations.push(
          createViolation(
            `${constraintName}.height[${idx}]`,
            `Height delta between ${a.name} and ${b.name} exceeds 1px`,
            { actual: heightDelta, expected: '<= 1' },
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
  readonly name?: string;
}

export interface LayoutSpec {
  readonly elements: Record<string, SelectorDescriptor>;
  readonly groups: Record<string, SelectorDescriptor>;
  readonly factories: LayoutConstraint[];
  readonly viewKey: string;
  readonly canvasKey: string;
}

export interface LayoutCtx {
  el(selector: SelectorInput, name?: string): ElemRef;
  group(selector: SelectorInput, name?: string): GroupRef;
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

function normalizeSelector(selector: SelectorInput, name?: string): SelectorDescriptor {
  if (typeof selector === 'string') {
    return { kind: 'css', selector, name };
  }
  return { kind: selector.type, selector: selector.selector, name };
}

function registerDescriptor(
  registry: Record<string, SelectorDescriptor>,
  prefix: string,
  selector: SelectorInput,
  name?: string,
): ElemRef | GroupRef {
  const descriptor = normalizeSelector(selector, name);
  const key = `${prefix}:${selectorIdCounter += 1}`;
  registry[key] = descriptor;
  return { key };
}

/**
 * Defines a layout specification using a builder function.
 * 
 * The builder receives a context object with methods to:
 * - `el(selector, name?)` - Define element references by CSS/XPath selector
 * - `group(selector, name?)` - Define groups of elements
 * - `view` - Reference to viewport element
 * - `canvas` - Reference to document body/canvas
 * - `must(...constraints)` - Add constraints that must be satisfied
 * 
 * The optional `name` parameter provides human-readable names for error messages.
 * 
 * @example
 * ```ts
 * const mySpec = defineLayoutSpec(ctx => {
 *   const header = ctx.el('header', 'App Header');
 *   const main = ctx.el('#main', 'Main Content');
 *   
 *   ctx.must(
 *     inside(header, ctx.view),
 *     below(main, header, between(0, 20))
 *   );
 * });
 * ```
 * 
 * @param builder - Builder function that defines elements and constraints
 * @returns LayoutSpec object ready for validation
 */
export function defineLayoutSpec(builder: (ctx: LayoutCtx) => void): LayoutSpec {
  const elementDescriptors: Record<string, SelectorDescriptor> = {
    [VIEW_KEY]: { kind: 'special', selector: 'view' },
    [CANVAS_KEY]: { kind: 'special', selector: 'canvas' },
  };
  const groupDescriptors: Record<string, SelectorDescriptor> = {};
  const factories: LayoutConstraint[] = [];

  const ctx: LayoutCtx = {
    el(selector, name?) {
      return registerDescriptor(elementDescriptors, 'el', selector, name);
    },
    group(selector, name?) {
      return registerDescriptor(groupDescriptors, 'group', selector, name);
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
  const base = descriptor?.name ?? descriptor?.selector ?? key;
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
