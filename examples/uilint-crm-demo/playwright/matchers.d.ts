import type { LayoutSpec } from '@uilint/core';
import type { MatcherRunOptions } from '@uilint/playwright';

declare global {
  namespace PlaywrightTest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R, _T = unknown> {
      toMatchLayout(spec: LayoutSpec, options?: MatcherRunOptions): Promise<R>;
    }
  }
}

export {};

