import {
  alignedHorizontally,
  amountOfVisible,
  between,
  below,
  defineLayoutSpec,
  eq,
  inside,
} from '@uilint/core';

export const navigationMenuSpec = defineLayoutSpec(ctx => {
  const header = ctx.el('#site-header');
  const menu = ctx.el('#primary-menu');
  const menuItems = ctx.group('#primary-menu .nav-link');

  ctx.must(
    inside(header, ctx.view, {
      left: eq(0),
      right: eq(0),
      top: between(0, 20),
    }),
    below(menu, header, between(0, 24)),
    alignedHorizontally(menuItems, 4),
    amountOfVisible(menuItems, eq(4)),
  );
});
