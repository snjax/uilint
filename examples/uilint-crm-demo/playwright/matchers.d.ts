import type { LayoutSpec } from '@uilint/core';
import type { MatcherRunOptions } from '@uilint/playwright';

declare global {
  namespace PlaywrightTest {
    interface Matchers<R, T> {
      toMatchLayout(spec: LayoutSpec, options?: MatcherRunOptions): Promise<R>;
    }
  }
}

export {};

