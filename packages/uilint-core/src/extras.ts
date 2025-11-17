import type { Constraint, Elem, Group, Range, Violation } from './types.js';
import { pairwise } from './combinators.js';
import { buildConstraint, createViolation, evaluateRange, DEFAULT_ROW_TOLERANCE_PX } from './constraint-utils.js';
import { ratio } from './primitives.js';

/**
 * @notice Table layout options used by `tableLayout`.
 * @property columns Number of columns expected in each row.
 * @property verticalMargin Optional range for vertical gaps between rows.
 * @property horizontalMargin Optional range for horizontal gaps between items in a row.
 */
export interface TableLayoutOpts {
  readonly columns: number;
  readonly verticalMargin?: Range;
  readonly horizontalMargin?: Range;
}

/**
 * @notice Constrains an element to be "almost square".
 * @param e Element whose width/height ratio is checked.
 * @param tolerance Allowed deviation from perfect square (ratio `1`).
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking width/height ratio.
 */
export function almostSquared(e: Elem, tolerance = 0.1, name = 'almostSquared'): Constraint {
  return ratio(e.width, e.height, 1, tolerance, name);
}

/**
 * @notice Ensures neighboring items have roughly equal horizontal gaps.
 * @param items Items arranged horizontally.
 * @param gapTolerance Allowed deviation from the baseline gap.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint checking gap consistency.
 */
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

/**
 * @notice Groups elements into rows based on their top coordinate.
 * @param items Flat list of items to cluster into rows.
 * @returns Array of rows, each row being a group of items.
 */
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
 * @notice Validates that items form a regular grid/table layout.
 * @param items Items assumed to participate in a grid.
 * @param opts Table layout options (columns, vertical/horizontal margins).
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint validating table-like alignment.
 */
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

/**
 * @notice Ensures the first/last items in a row respect container side margins and share consistent ordering.
 * @param items Horizontal row of items.
 * @param container Bounding container element.
 * @param marginRange Allowed margin range from container sides.
 * @param name Optional custom name for the resulting constraint.
 * @returns Constraint validating side margins and basic ordering assumptions.
 */
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

