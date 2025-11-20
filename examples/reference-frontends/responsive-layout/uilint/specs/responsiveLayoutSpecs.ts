import {
  defineLayoutSpec,
  leftOf,
  below,
  between,
  alignedHorizontally,
} from '@uilint/core';

export const responsiveDesktopSpec = defineLayoutSpec(ctx => {
  const sidebar = ctx.el('#sidebar');
  const content = ctx.el('#content');

  ctx.must(
    leftOf(sidebar, content, between(0, 40)),
    alignedHorizontally([sidebar, content], 4),
  );
});

export const responsiveMobileSpec = defineLayoutSpec(ctx => {
  const sidebar = ctx.el('#sidebar');
  const content = ctx.el('#content');

  ctx.must(
    below(content, sidebar, between(0, 20)),
  );
});
