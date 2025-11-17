import {
  alignedHorizontally,
  below,
  countIs,
  defineLayoutSpec,
  eq,
  inside,
  between,
} from '@uilint/core';

export const loginLayoutSpec = defineLayoutSpec('example-login', ctx => {
  const header = ctx.el('#app-header');
  const menu = ctx.el('#primary-nav');
  const hero = ctx.el('#hero-panel');
  const footer = ctx.el('#app-footer');
  const navItems = ctx.group('#primary-nav .nav-item');

  ctx.mustRef(rt => [
    inside(rt.el(header), rt.viewport, {
      left: eq(0),
      right: eq(0),
      top: eq(0),
    }),
    below(rt.el(menu), rt.el(header), between(0, 8)),
    below(rt.el(hero), rt.el(menu), between(24, 48)),
    inside(rt.el(footer), rt.screen, {
      left: eq(0),
      right: eq(0),
      bottom: eq(0),
    }),
    alignedHorizontally(rt.group(navItems), 4),
    countIs(rt.group(navItems), eq(3)),
  ]);
});

