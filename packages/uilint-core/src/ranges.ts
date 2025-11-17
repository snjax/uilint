import type { Range } from './types.js';

/**
 * @notice Creates a range that matches values exactly equal to `target`.
 * @param target Target value to compare against.
 * @returns Range function that returns `true` only when `value === target`.
 */
export const eq = (target: number): Range => (value: number) => value === target;

/**
 * @notice Creates a range that matches values strictly greater than `target`.
 * @param target Lower bound (exclusive).
 * @returns Range function that returns `true` only when `value > target`.
 */
export const gt = (target: number): Range => (value: number) => value > target;

/**
 * @notice Creates a range that matches values greater than or equal to `target`.
 * @param target Lower bound (inclusive).
 * @returns Range function that returns `true` only when `value >= target`.
 */
export const gte = (target: number): Range => (value: number) => value >= target;

/**
 * @notice Creates a range that matches values strictly less than `target`.
 * @param target Upper bound (exclusive).
 * @returns Range function that returns `true` only when `value < target`.
 */
export const lt = (target: number): Range => (value: number) => value < target;

/**
 * @notice Creates a range that matches values less than or equal to `target`.
 * @param target Upper bound (inclusive).
 * @returns Range function that returns `true` only when `value <= target`.
 */
export const lte = (target: number): Range => (value: number) => value <= target;

/**
 * @notice Creates a range that matches values falling within `[min, max]` (inclusive).
 * @param min Inclusive lower bound.
 * @param max Inclusive upper bound.
 * @returns Range function that returns `true` only when `min <= value <= max`.
 */
export const between = (min: number, max: number): Range => (value: number) =>
  value >= min && value <= max;

/**
 * @notice Creates a range that matches values close to `expected`, within ±`tolerance`.
 * @param expected Expected center value.
 * @param tolerance Allowed absolute deviation from `expected`.
 * @returns Range function that returns `true` when `|value - expected| <= tolerance`.
 */
export const approx = (expected: number, tolerance: number): Range => (value: number) =>
  Math.abs(value - expected) <= tolerance;

/**
 * @notice Range that accepts any numeric value unconditionally.
 * @returns Always returns `true` for any numeric input.
 */
export const anyRange: Range = () => true;

