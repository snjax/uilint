import type { Elem, ElemSnapshot, Group, Violation } from './types.js';
import { createElem } from './types.js';
import type { LayoutReport, LayoutSpec, SnapshotEvaluationOptions, SnapshotStore } from './spec.js';

/**
 * @notice Builds a placeholder snapshot for missing elements so constraints can still run.
 * @param descriptor Optional selector descriptor from the spec.
 * @param key Internal key used to identify the element.
 * @returns Synthetic snapshot marked as not visible/not present.
 */
function createPlaceholderSnapshot(
  descriptor: { selector: string } | undefined,
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

/**
 * @notice Generates a human-readable element name for reporting.
 * @param descriptor Optional selector descriptor from the spec.
 * @param key Internal key used to identify the element/group.
 * @param index Optional index within a group.
 * @returns Name used in violation messages.
 */
function createElemName(descriptor: { selector: string } | undefined, key: string, index?: number): string {
  const base = descriptor?.selector ?? key;
  return typeof index === 'number' ? `${base}[${index}]` : base;
}

/**
 * @notice Evaluates a layout spec against an in-memory snapshot store.
 * @param spec Compiled layout specification.
 * @param snapshots Snapshot store keyed by element/group refs.
 * @param options Snapshot evaluation options (viewport/screen snapshots, viewportTag).
 * @returns Structured layout report with aggregated violations.
 */
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

  const resolveElement = (key: string): Elem => {
    if (key === spec.viewportKey) return viewportElem;
    if (key === spec.screenKey) return screenElem;

    const cached = elementCache.get(key);
    if (cached) return cached;

    const descriptor = spec.elements[key];
    const available = snapshots[key];
    const snapshot =
      available && available.length ? available[0]! : createPlaceholderSnapshot(descriptor, key);

    const elem = createElem({
      name: createElemName(descriptor, key),
      snapshot,
    });
    elementCache.set(key, elem);
    return elem;
  };

  const resolveGroup = (key: string): Group => {
    const cached = groupCache.get(key);
    if (cached) return cached;

    const descriptor = spec.groups[key];
    const available = snapshots[key];
    if (!available || !available.length) {
      groupCache.set(key, []);
      return [];
    }
    const elems = available.map((snapshot, index) =>
      createElem({ name: createElemName(descriptor, key, index), snapshot }),
    );
    groupCache.set(key, elems);
    return elems;
  };

  const runtimeCtx = {
    el(ref: { key: string }): Elem {
      return resolveElement(ref.key);
    },
    group(ref: { key: string }): Group {
      return resolveGroup(ref.key);
    },
    get viewport() {
      return viewportElem;
    },
    get screen() {
      return screenElem;
    },
  };

  const violations: Violation[] = [];
  spec.factories.forEach(factory => {
    const constraints = factory(runtimeCtx);
    const normalized = Array.isArray(constraints) ? constraints : [constraints];
    normalized.forEach(constraint => {
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

