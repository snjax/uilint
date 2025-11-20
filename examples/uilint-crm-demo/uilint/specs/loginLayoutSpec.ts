import {
  alignedHorizEqualGap,
  alignedHorizontally,
  below,
  centered,
  countIs,
  defineLayoutSpec,
  eq,
  inside,
  between,
  widthIn,
} from '@uilint/core';
import type { ConstraintSource } from '@uilint/core';

/**
 * Login layout lint covers:
 * - header/nav/footer pinned to viewport edges
 * - hero card remains centered and within responsive width bounds
 * - desktop nav items are evenly spaced; on mobile the nav wraps but stays within bounds
 * - footer always sticks to the bottom of the scrollable screen
 */
export const loginLayoutSpec = defineLayoutSpec(ctx => {
  const header = ctx.el('#app-header');
  const menu = ctx.el('#primary-nav');
  const hero = ctx.el('#hero-panel');
  const footer = ctx.el('#app-footer');
  const navItems = ctx.group('#primary-nav .nav-item');
  const content = ctx.el('#content');

  ctx.must(rt => {
    const viewportClass = rt.viewportClass;
    const heroWidthRange =
      viewportClass === 'desktop' ? between(360, 680) : viewportClass === 'tablet' ? between(320, 560) : between(280, 440);
    const constraints: ConstraintSource[] = [
      inside(header, ctx.view, {
        left: eq(0),
        right: eq(0),
        top: eq(0),
      }),
      inside(menu, ctx.view, { left: eq(0), right: eq(0) }),
      below(menu, header, between(0, 8)),
      below(hero, menu, between(24, 48)),
      centered(hero, ctx.view, { h: between(-4, 4) }),
      widthIn(hero, heroWidthRange),
      inside(content, ctx.view, { left: eq(0), right: eq(0) }),
      inside(footer, ctx.canvas, {
        left: eq(0),
        right: eq(0),
        bottom: eq(0),
      }),
      countIs(navItems, eq(3)),
    ];

    if (viewportClass === 'desktop') {
      constraints.push(
        alignedHorizontally(navItems, 4),
        alignedHorizEqualGap(navItems, 12),
      );
    } else {
      constraints.push(widthIn(menu, between(260, rt.el(header).width)));
    }

    return constraints;
  });
});
