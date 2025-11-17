import {
  defineLayoutSpec,
  leftOf,
  below,
  between,
  alignedHorizontally,
} from '@uilint/core';

export const responsiveDesktopSpec = defineLayoutSpec('reference-responsive-desktop', ctx => {
  const sidebar = ctx.el('#sidebar');
  const content = ctx.el('#content');

  ctx.mustRef(rt => [
    leftOf(rt.el(sidebar), rt.el(content), between(0, 40)),
    alignedHorizontally([rt.el(sidebar), rt.el(content)], 4),
  ]);
});

export const responsiveMobileSpec = defineLayoutSpec('reference-responsive-mobile', ctx => {
  const sidebar = ctx.el('#sidebar');
  const content = ctx.el('#content');

  ctx.mustRef(rt => [
    below(rt.el(content), rt.el(sidebar), between(0, 20)),
  ]);
});

