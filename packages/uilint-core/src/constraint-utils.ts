import type { Constraint, Elem, Range, Violation } from './types.js';
import { anyRange } from './ranges.js';

export const DEFAULT_ROW_TOLERANCE_PX = 5;

/**
 * @notice Builds a constraint object, falling back to `fallback` when `name` is undefined.
 */
export function buildConstraint(
  name: string | undefined,
  fallback: string,
  check: () => Violation[],
): Constraint {
  return {
    name: name ?? fallback,
    check,
  };
}

/**
 * @notice Factory helper for structured violations.
 */
export function createViolation(constraint: string, message: string, details?: unknown): Violation {
  return { constraint, message, details };
}

/**
 * @notice Ensures a range predicate exists, defaulting to `anyRange`.
 */
export function ensureRange(range?: Range): Range {
  return range ?? anyRange;
}

/**
 * @notice Evaluates a numeric predicate and returns a violation when the predicate fails.
 */
export function evaluateRange(
  range: Range,
  value: number,
  constraint: string,
  message: string,
  details?: Record<string, unknown>,
): Violation | null {
  return range(value) ? null : createViolation(constraint, message, { value, ...details });
}

/**
 * @notice Normalizes `Constraint | Constraint[]` into an array.
 */
export function flattenConstraints(constraints: Constraint | Constraint[]): Constraint[] {
  return Array.isArray(constraints) ? constraints : [constraints];
}

/**
 * @notice Prefixes constraint names for nested combinators.
 */
export function prefixViolations(violations: Violation[], prefix: string): Violation[] {
  return violations.map(v => ({
    ...v,
    constraint: `${prefix}.${v.constraint}`,
  }));
}

/**
 * @notice Executes a child constraint factory for a single element and prefixes violations.
 */
export function evaluateChildConstraints(
  elem: Elem,
  mk: (e: Elem) => Constraint | Constraint[],
  prefix: string,
): Violation[] {
  return flattenConstraints(mk(elem)).flatMap(constraint =>
    prefixViolations(constraint.check(), `${prefix}.${constraint.name}`),
  );
}

