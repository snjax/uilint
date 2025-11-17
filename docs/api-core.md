## @uilint/core API reference

This document summarizes the main public APIs of the `@uilint/core` package.

### Core data model

#### `ElemSnapshot`

```ts
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
```

Snapshots are created by the Playwright adapter and never talk to the browser.

#### `Elem` and `Group`

```ts
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

export type Group = Elem[];

export interface ElemFactoryOptions {
  readonly name: string;
  readonly snapshot: ElemSnapshot;
  readonly findChild?: (key: string) => Elem | undefined;
}

export function createElem(options: ElemFactoryOptions): Elem;
```

`Elem` wraps a snapshot and provides convenient derived properties. `Group` is an array of `Elem`.

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

export function inside(a: Elem, b: Elem, edges: EdgeRanges, name?: string): Constraint;

export function widthIn(e: Elem, range: Range, name?: string): Constraint;
export function heightIn(e: Elem, range: Range, name?: string): Constraint;

export function ratio(
  a: number,
  b: number,
  expected: number,
  tolerance: number,
  name?: string,
): Constraint;

export function alignedHorizontally(elems: Group, tolerance: number, name?: string): Constraint;
export function alignedVertically(elems: Group, tolerance: number, name?: string): Constraint;

export function centered(
  a: Elem,
  b: Elem,
  opts: { h?: Range; v?: Range },
  name?: string,
): Constraint;

export function visible(e: Elem, expectVisible: boolean, name?: string): Constraint;
export function present(e: Elem, expectPresent: boolean, name?: string): Constraint;

export function textEquals(e: Elem, expected: string, name?: string): Constraint;
export function textMatches(e: Elem, re: RegExp | string, name?: string): Constraint;
```

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

export interface LayoutCtx {
  el(selector: SelectorInput): ElemRef;
  group(selector: SelectorInput): GroupRef;
  readonly viewport: ElemRef;
  readonly screen: ElemRef;
  must(...constraints: (Constraint | Constraint[])[]): void;
  mustRef(factory: (rt: RuntimeCtx) => Constraint | Constraint[]): void;
}

export interface RuntimeCtx {
  el(ref: ElemRef): Elem;
  group(ref: GroupRef): Group;
  readonly viewport: Elem;
  readonly screen: Elem;
}

export interface LayoutSpec {
  readonly name: string;
  readonly elements: Record<string, SelectorDescriptor>;
  readonly groups: Record<string, SelectorDescriptor>;
  readonly factories: Array<(rt: RuntimeCtx) => Constraint | Constraint[]>;
  readonly viewportKey: string;
  readonly screenKey: string;
}

export function defineLayoutSpec(name: string, builder: (ctx: LayoutCtx) => void): LayoutSpec;
```

### Snapshot runtime

```ts
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

export function evaluateLayoutSpecOnSnapshots(
  spec: LayoutSpec,
  snapshots: SnapshotStore,
  options: SnapshotEvaluationOptions,
): LayoutReport;
```

`evaluateLayoutSpecOnSnapshots` is the core engine used by the Playwright adapter. You typically call it indirectly via `@uilint/playwright`, but it is available if you want to plug your own snapshot source.


