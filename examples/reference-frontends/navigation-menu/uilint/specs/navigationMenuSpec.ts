import {
  alignedHorizontally,
  amountOfVisible,
  between,
  below,
  defineLayoutSpec,
  eq,
  inside,
} from '@uilint/core';

export const navigationMenuSpec = defineLayoutSpec('reference-navigation-menu', ctx => {
  const header = ctx.el('#site-header');
  const menu = ctx.el('#primary-menu');
  const menuItems = ctx.group('#primary-menu .nav-link');

  ctx.mustRef(rt => [
    inside(rt.el(header), rt.viewport, {
      left: eq(0),
      right: eq(0),
      top: between(0, 20),
    }),
    below(rt.el(menu), rt.el(header), between(0, 24)),
    alignedHorizontally(rt.group(menuItems), 4),
    amountOfVisible(rt.group(menuItems), eq(4)),
  ]);
});

