import type { Constraint, ElemSnapshot } from './types.js';

/**
 * @notice User-facing selector input accepted by `ctx.el/group`.
 * @remarks
 * - String form is treated as a CSS selector.
 * - Object form allows explicit selector type.
 */
export type SelectorInput = string | { type: 'css' | 'xpath'; selector: string };

/**
 * @notice Internal selector representation.
 */
export type SelectorKind = 'css' | 'xpath' | 'special';

/**
 * @notice Descriptor stored inside `LayoutSpec`.
 * @property kind Selector kind (`css`, `xpath` or `special`).
 * @property selector Raw selector string or symbolic name for `special`.
 */
export interface SelectorDescriptor {
  readonly kind: SelectorKind;
  readonly selector: string;
}

/**
 * @notice Reference to a single element declared inside a spec builder.
 * @property key Internal key that links to snapshots at runtime.
 */
export interface ElemRef {
  readonly key: string;
}

/**
 * @notice Reference to a group declared inside a spec builder.
 * @property key Internal key that links to snapshots at runtime.
 */
export interface GroupRef {
  readonly key: string;
}

/**
 * @notice Factory invoked at runtime to produce constraints.
 * @param rt Runtime context that exposes resolved elements, groups, viewport and screen.
 * @returns One or many constraints to be evaluated.
 */
export type ConstraintFactory = (rt: RuntimeCtx) => Constraint | Constraint[];

/**
 * @notice Runtime context exposed inside `ctx.mustRef`.
 * @property viewport Virtual element representing the current viewport box.
 * @property screen Virtual element representing the scrollable screen.
 */
export interface RuntimeCtx {
  el(ref: ElemRef): Elem;
  group(ref: GroupRef): Group;
  readonly viewport: Elem;
  readonly screen: Elem;
}

/**
 * @notice Build-time context passed to `defineLayoutSpec`.
 * @property viewport Reference to the virtual viewport element.
 * @property screen Reference to the virtual screen element.
 */
export interface LayoutCtx {
  el(selector: SelectorInput): ElemRef;
  group(selector: SelectorInput): GroupRef;
  readonly viewport: ElemRef;
  readonly screen: ElemRef;
  must(...constraints: (Constraint | Constraint[])[]): void;
  mustRef(factory: ConstraintFactory): void;
}

/**
 * @notice Serialized representation of a layout spec.
 * @property name Human readable spec name.
 * @property elements Registry of element selectors by key.
 * @property groups Registry of group selectors by key.
 * @property factories List of runtime factories producing constraints.
 * @property viewportKey Special key pointing to viewport element.
 * @property screenKey Special key pointing to screen element.
 */
export interface LayoutSpec {
  readonly name: string;
  readonly elements: Record<string, SelectorDescriptor>;
  readonly groups: Record<string, SelectorDescriptor>;
  readonly factories: ConstraintFactory[];
  readonly viewportKey: string;
  readonly screenKey: string;
}

let selectorIdCounter = 0;
const VIEWPORT_KEY = '__uilint.viewport';
const SCREEN_KEY = '__uilint.screen';

/**
 * @notice Normalizes user input into an internal selector descriptor.
 * @param selector User-provided selector (CSS string or descriptor object).
 * @returns Normalized descriptor used internally by layout specs.
 */
function normalizeSelector(selector: SelectorInput): SelectorDescriptor {
  if (typeof selector === 'string') {
    return { kind: 'css', selector };
  }
  return { kind: selector.type, selector: selector.selector };
}

/**
 * @notice Registers a selector descriptor and returns a reference.
 * @param registry Target registry (`elements` or `groups`).
 * @param prefix Prefix used when generating unique keys.
 * @param selector Input selector value.
 * @returns Element or group reference pointing to the registered descriptor.
 */
function registerDescriptor(
  registry: Record<string, SelectorDescriptor>,
  prefix: string,
  selector: SelectorInput,
): ElemRef | GroupRef {
  const descriptor = normalizeSelector(selector);
  const key = `${prefix}:${(selectorIdCounter += 1)}`;
  registry[key] = descriptor;
  return { key };
}

/**
 * @notice Creates an immutable layout spec by recording element/group references and constraint factories.
 * @param name Human readable name for the spec.
 * @param builder Specification builder that declares elements, groups and constraints.
 * @returns Compiled layout specification.
 */
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

/**
 * @notice Additional metadata used when running specs.
 */
export interface LayoutRunOptions {
  readonly viewportTag?: string;
}

/**
 * @notice Report returned after evaluating a layout spec.
 */
export interface LayoutReport {
  readonly specName: string;
  readonly viewportTag?: string;
  readonly viewportSize: { width: number; height: number };
  readonly violations: ReturnType<Constraint['check']>;
}

/**
 * @notice Map of spec references to captured element snapshots.
 */
export type SnapshotStore = Record<string, ElemSnapshot[] | undefined>;

/**
 * @notice Options required when running a spec against snapshots.
 */
export interface SnapshotEvaluationOptions extends LayoutRunOptions {
  readonly viewport: ElemSnapshot;
  readonly screen?: ElemSnapshot;
}

