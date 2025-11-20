## @uilint/core API reference

This document summarizes the main public APIs of the `@uilint/core` package.

### Core data model

#### `ElemSnapshot`

```ts
export interface FrameRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

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

export interface TextMetrics {
  readonly lineCount: number;
  readonly lineRects: FrameRect[];
  readonly boundingRect: FrameRect | null;
}
```

Snapshots are created by the Playwright adapter and never talk to the browser. When present, `textMetrics` captures serialized line rectangles and counts so that higher-level text constraints can assert overflow and line limits without re-measuring in Node.

#### `Elem` and `Group`

```ts
export interface Elem {
  readonly name: string;
  readonly snap: ElemSnapshot;

  readonly box: FrameRect;
  readonly view: FrameRect;
  readonly canvas: FrameRect;

  readonly left: number;   // alias for box.left
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

export type Group = Elem[];

export interface ElemFactoryOptions {
  readonly name: string;
  readonly snapshot: ElemSnapshot;
  readonly findChild?: (key: string) => Elem | undefined;
}

export function createElem(options: ElemFactoryOptions): Elem;
```

All shorthand geometry getters (`left`, `width`, etc.) operate on the `box` frame. Switch to `view` (clipped) or `canvas` (scrollable) via `getRect('view' | 'canvas')` when you need those perspectives. For the top-level document element specifically, the `view` frame equals the current browser viewport and the `canvas` frame equals the entire scrollable page (so its `box` and `canvas` match). `Group` is an array of `Elem`.

### Ranges

```ts
export type Range = (value: number) => boolean;

export const eq: (target: number) => Range;
export const gt: (target: number) => Range;
export const gte: (target: number) => Range;
export const lt: (target: number) => Range;
export const lte: (target: number) => Range;
export const between: (min: number, max: number) => Range;
export const approx: (expected: number, tolerance: number) => Range;
export const anyRange: Range;
```

Ranges are used by all numeric relations (gaps, margins, widths, counts, etc.).

### Constraints and violations

```ts
export interface Violation {
  readonly constraint: string;
  readonly message: string;
  readonly details?: unknown;
}

export interface Constraint {
  readonly name: string;
  check(): Violation[];
}
```

Constraints are pure objects that expose a `check` method; they do not perform I/O and can be unit-tested directly.

### Primitive relations

All primitives accept runtime `Elem`/`Group` instances and a `Range` (or options), and return a `Constraint`.

```ts
export function below(a: Elem, b: Elem, range: Range, name?: string): Constraint;
export function above(a: Elem, b: Elem, range: Range, name?: string): Constraint;
export function leftOf(a: Elem, b: Elem, range: Range, name?: string): Constraint;
export function rightOf(a: Elem, b: Elem, range: Range, name?: string): Constraint;

export interface EdgeRanges {
  readonly top?: Range;
  readonly right?: Range;
  readonly bottom?: Range;
  readonly left?: Range;
}

export interface NearOptions {
  readonly left?: Range;
  readonly right?: Range;
  readonly top?: Range;
  readonly bottom?: Range;
}

export function near(a: Elem, b: Elem, options: NearOptions, name?: string): Constraint;

export function inside(a: Elem, b: Elem, edges?: EdgeRanges, name?: string): Constraint;

export function widthIn(e: Elem, range: Range, name?: string): Constraint;
export function heightIn(e: Elem, range: Range, name?: string): Constraint;

export function approxRelative(expected: number, tolerance: number): Range;
export function widthMatches(
  element: Elem,
  reference: Elem,
  options: { tolerance?: number; ratio?: Range },
  name?: string,
): Constraint;
export function heightMatches(
  element: Elem,
  reference: Elem,
  options: { tolerance?: number; ratio?: Range },
  name?: string,
): Constraint;

export function ratio(
  a: number,
  b: number,
  expected: number,
  tolerance: number,
  name?: string,
): Constraint;

export function alignedHorizontally(elems: Group, tolerance: number, name?: string): Constraint;
export function alignedVertically(elems: Group, tolerance: number, name?: string): Constraint;
export function alignedHorizontallyTop(elems: Group, tolerance: number, name?: string): Constraint;
export function alignedHorizontallyBottom(elems: Group, tolerance: number, name?: string): Constraint;
export function alignedHorizontallyEdges(elems: Group, tolerance: number, name?: string): Constraint;
export function alignedVerticallyLeft(elems: Group, tolerance: number, name?: string): Constraint;
export function alignedVerticallyRight(elems: Group, tolerance: number, name?: string): Constraint;
export function alignedVerticallyEdges(elems: Group, tolerance: number, name?: string): Constraint;

export function centered(
  a: Elem,
  b: Elem,
  opts: { h?: Range; v?: Range },
  name?: string,
): Constraint;

export interface OnOptions {
  readonly horizontal?: {
    readonly elementEdge: 'left' | 'right';
    readonly referenceEdge: 'left' | 'right';
    readonly range: Range;
  };
  readonly vertical?: {
    readonly elementEdge: 'top' | 'bottom';
    readonly referenceEdge: 'top' | 'bottom';
    readonly range: Range;
  };
}

export function on(element: Elem, reference: Elem, options: OnOptions, name?: string): Constraint;

export function visible(e: Elem, expectVisible: boolean, name?: string): Constraint;
export function present(e: Elem, expectPresent: boolean, name?: string): Constraint;

export function textEquals(e: Elem, expected: string, name?: string): Constraint;
export function textMatches(e: Elem, re: RegExp | string, name?: string): Constraint;
export function textDoesNotOverflow(e: Elem, name?: string): Constraint;
export function textLinesAtMost(e: Elem, maxLines: number, name?: string): Constraint;
export function singleLineText(e: Elem, name?: string): Constraint;
```

`inside(element, container)` without explicit edge ranges now ensures the element stays fully inside its container (left/right/top/bottom gaps default to `gte(0)`). Provide your own `Range` (including negative values) to allow bleed. `near` expresses directional proximity (left/right/top/bottom) and automatically fails when elements overlap. Use `widthMatches` / `heightMatches` with either a ratio `Range` (e.g. `between(0.95, 1)`) or the `approxRelative` helper when you need percentage-based comparisons. The `on` relation lets you describe “on corner/edge” placements by pairing specific edges of the element and the reference element with the desired offsets.

`textDoesNotOverflow` inspects both scrollable dimensions and the rendered text rectangle to make sure content neither bleeds out of the element nor gets clipped by overflow. `textLinesAtMost` relies on Playwright-side text metrics (line counts) to enforce the maximum number of rendered lines. `singleLineText` combines both checks for common form labels and buttons that must stay on one line without overflow.

### Combinators and helpers

```ts
export function forAll(
  elems: Group,
  mk: (e: Elem) => Constraint | Constraint[],
  name?: string,
): Constraint;

export function exists(
  elems: Group,
  mk: (e: Elem) => Constraint | Constraint[],
  name?: string,
): Constraint;

export function none(
  elems: Group,
  mk: (e: Elem) => Constraint | Constraint[],
  name?: string,
): Constraint;

export function countIs(elems: Group, range: Range, name?: string): Constraint;
export function amountOfVisible(elems: Group, range: Range, name?: string): Constraint;

export function pairwise<T>(arr: T[]): [T, T][];
export function windowed<T>(arr: T[], size: number): T[][];
```

These helpers make it easy to express “for every card”, “at least one item”, counts, and sliding-window style relationships.

### Extras

```ts
export function almostSquared(e: Elem, tolerance?: number, name?: string): Constraint;

export function alignedHorizEqualGap(
  items: Group,
  gapTolerance: number,
  name?: string,
): Constraint;

export function alignedVertEqualGap(
  items: Group,
  gapTolerance: number,
  name?: string,
): Constraint;

export interface TableLayoutOpts {
  readonly columns: number;
  readonly verticalMargin?: Range;
  readonly horizontalMargin?: Range;
}

export function tableLayout(items: Group, opts: TableLayoutOpts, name?: string): Constraint;

export function sidesHorizontallyInside(
  items: Group,
  container: Elem,
  marginRange?: Range,
  name?: string,
): Constraint;
```

Extras are higher-level layout patterns built on top of primitives and combinators.
Use `alignedHorizontallyTop/Bottom/Edges` (and the vertical counterparts) when you need to enforce alignment by specific edges rather than centers. `alignedHorizEqualGap` and `alignedVertEqualGap` verify that repeating elements share a consistent gutter horizontally or vertically. `sidesHorizontallyInside` is handy for tiered navigation rows where the first and last items must respect container padding.

### Spec and runtime interfaces

```ts
export interface ElemRef {
  readonly key: string;
}

export interface GroupRef {
  readonly key: string;
}

type SelectorInput = string | { type: 'css' | 'xpath'; selector: string };

export interface SelectorDescriptor {
  readonly kind: 'css' | 'xpath' | 'special';
  readonly selector: string;
}

export type ConstraintSource = Constraint | LayoutConstraint | ConstraintSource[];

export type LayoutConstraint = (rt: RuntimeCtx) => ConstraintSource;

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

export interface LayoutSpec {
  readonly elements: Record<string, SelectorDescriptor>;
  readonly groups: Record<string, SelectorDescriptor>;
  readonly factories: LayoutConstraint[];
  readonly viewKey: string;
  readonly canvasKey: string;
}

export function defineLayoutSpec(builder: (ctx: LayoutCtx) => void): LayoutSpec;
```

### Snapshot runtime

```ts
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
}

export function evaluateLayoutSpecOnSnapshots(
  spec: LayoutSpec,
  snapshots: SnapshotStore,
  options: SnapshotEvaluationOptions,
): LayoutReport;
```

`evaluateLayoutSpecOnSnapshots` is the core engine used by the Playwright adapter. You typically call it indirectly via `@uilint/playwright`, but it is available if you want to plug your own snapshot source.


