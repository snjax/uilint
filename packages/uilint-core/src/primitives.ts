import type { Constraint, Elem, Group, Range, Violation } from './types.js';
import { buildConstraint, createViolation, evaluateRange } from './constraint-utils.js';

/**
 * @notice Optional ranges for each edge when constraining one element inside another.
 */
export interface EdgeRanges {
  readonly top?: Range;
  readonly right?: Range;
  readonly bottom?: Range;
  readonly left?: Range;
}

/**
 * @notice Constrains element `a` to render below element `b` within a numeric range.
 * @param a Element that should appear below.
 * @param b Element that serves as a vertical anchor above `a`.
 * @param range Allowed difference `a.top - b.bottom`.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking the vertical offset.
 */
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

/**
 * @notice Constrains element `a` to render above element `b` within a numeric range.
 * @param a Element that should appear above.
 * @param b Element that serves as a vertical anchor below `a`.
 * @param range Allowed difference `b.top - a.bottom`.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking the vertical offset.
 */
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

/**
 * @notice Constrains element `a` to render left of element `b` within a numeric range.
 * @param a Element that should appear to the left.
 * @param b Element that serves as a horizontal anchor to the right of `a`.
 * @param range Allowed horizontal gap `b.left - a.right`.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking the horizontal gap.
 */
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

/**
 * @notice Constrains element `a` to render right of element `b` within a numeric range.
 * @param a Element that should appear to the right.
 * @param b Element that serves as a horizontal anchor to the left of `a`.
 * @param range Allowed horizontal gap `a.left - b.right`.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking the horizontal gap.
 */
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

/**
 * @notice Constrains the edges of element `a` to stay inside element `b`.
 * @param a Inner element being constrained.
 * @param b Outer container element.
 * @param edges Optional ranges per edge (`top`, `right`, `bottom`, `left`).
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking edge distances between `a` and `b`.
 */
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

/**
 * @notice Constrains an element's width to stay within the provided range.
 * @param e Element whose width is measured.
 * @param range Allowed width range.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking `e.width`.
 */
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

/**
 * @notice Constrains an element's height to stay within the provided range.
 * @param e Element whose height is measured.
 * @param range Allowed height range.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking `e.height`.
 */
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

/**
 * @notice Constrains the ratio `a / b` to stay near `expected` within `tolerance`.
 * @param a Numerator (for example `e.width`).
 * @param b Denominator (for example `e.height`).
 * @param expected Expected ratio value.
 * @param tolerance Allowed absolute deviation from `expected`.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking the ratio.
 */
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

/**
 * @notice Ensures elements share a similar horizontal alignment (y-axis).
 * @param elems Group of elements to compare.
 * @param tolerance Maximum allowed deviation in `centerY`.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking vertical alignment.
 */
export function alignedHorizontally(elems: Group, tolerance: number, name?: string): Constraint {
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

/**
 * @notice Ensures elements share a similar vertical alignment (x-axis).
 * @param elems Group of elements to compare.
 * @param tolerance Maximum allowed deviation in `centerX`.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking horizontal alignment.
 */
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

/**
 * @notice Constrains element centers along horizontal and vertical axes.
 * @param a Element being positioned.
 * @param b Reference element to align with.
 * @param opts Optional horizontal (`h`) and vertical (`v`) range predicates.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking the center offsets.
 */
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

/**
 * @notice Constrains an element's visibility flag.
 * @param e Element whose visibility is being asserted.
 * @param expectVisible Expected visibility value.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking `e.visible`.
 */
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

/**
 * @notice Constrains an element's presence flag.
 * @param e Element whose presence is being asserted.
 * @param expectPresent Expected presence value.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking `e.present`.
 */
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

/**
 * @notice Ensures the element text equals the expected string.
 * @param e Element whose text is compared.
 * @param expected Expected text content.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking exact text equality.
 */
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

/**
 * @notice Ensures the element text matches a regex or literal pattern.
 * @param e Element whose text is matched.
 * @param re Regular expression or literal string pattern.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking a text pattern match.
 */
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
