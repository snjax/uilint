import type { Constraint, Elem, Group, Range } from './types.js';
import {
  buildConstraint,
  createViolation,
  evaluateChildConstraints,
  evaluateRange,
} from './constraint-utils.js';

/**
 * @notice Applies a constraint factory to every element of a group.
 * @param elems Group of elements to iterate over.
 * @param mk Factory that builds one or more constraints per element.
 * @param name Optional custom name for the parent constraint.
 * @returns Combined constraint aggregating all element violations.
 */
export function forAll(
  elems: Group,
  mk: (e: Elem) => Constraint | Constraint[],
  name?: string,
): Constraint {
  const constraintName = name ?? 'forAll';
  return buildConstraint(constraintName, constraintName, () => {
    const violations: ReturnType<typeof evaluateChildConstraints> = [];
    elems.forEach((elem, index) => {
      violations.push(...evaluateChildConstraints(elem, mk, `${constraintName}[${index}]`));
    });
    return violations;
  });
}

/**
 * @notice Passes when at least one element satisfies the provided factory.
 * @param elems Group of elements to search through.
 * @param mk Factory that is considered satisfied when it yields no violations.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint that fails if no element satisfies `mk`.
 */
export function exists(
  elems: Group,
  mk: (e: Elem) => Constraint | Constraint[],
  name?: string,
): Constraint {
  const constraintName = name ?? 'exists';
  return buildConstraint(constraintName, constraintName, () => {
    const details: ReturnType<typeof evaluateChildConstraints>[] = [];
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

/**
 * @notice Fails when any element satisfies the predicate.
 * @param elems Group of elements to search through.
 * @param mk Factory that is considered matched when it yields no violations.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint that fails if any element satisfies `mk`.
 */
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

/**
 * @notice Constrains the length of a group.
 * @param elems Group whose size is checked.
 * @param range Allowed range for `elems.length`.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint that fails when the group size is out of range.
 */
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

/**
 * @notice Constrains the number of visible elements inside a group.
 * @param elems Group whose visible subset is counted.
 * @param range Allowed range for `visible` count.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint that fails when visible count is out of range.
 */
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

/**
 * @notice Generates adjacent pairs for convenience when comparing neighbors.
 * @typeParam T Element type in the original array.
 * @param arr Source array.
 * @returns Array of `[prev, next]` pairs.
 */
export function pairwise<T>(arr: T[]): [T, T][] {
  const result: [T, T][] = [];
  for (let i = 0; i < arr.length - 1; i += 1) {
    result.push([arr[i]!, arr[i + 1]!]);
  }
  return result;
}

/**
 * @notice Generates sliding windows of size `size`.
 * @typeParam T Element type in the original array.
 * @param arr Source array.
 * @param size Window size (must be > 0).
 * @returns Contiguous subarrays of length `size`.
 */
export function windowed<T>(arr: T[], size: number): T[][] {
  if (size <= 0 || arr.length < size) return [];
  const windows: T[][] = [];
  for (let i = 0; i <= arr.length - size; i += 1) {
    windows.push(arr.slice(i, i + size));
  }
  return windows;
}

