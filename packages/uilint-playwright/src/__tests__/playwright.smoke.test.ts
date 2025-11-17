import { describe, expect, it } from 'vitest';
import {
  assertLayout,
  collectSnapshots,
  runLayoutSpec,
  uilintMatchers,
  toMatchLayout,
} from '../index.js';

describe('uilint-playwright exports', () => {
  it('exposes snapshot collector and runLayoutSpec', () => {
    expect(typeof collectSnapshots).toBe('function');
    expect(typeof runLayoutSpec).toBe('function');
  });

  it('exposes matchers and helpers', () => {
    expect(typeof uilintMatchers.toMatchLayout).toBe('function');
    expect(typeof toMatchLayout).toBe('function');
    expect(typeof assertLayout).toBe('function');
  });
});

