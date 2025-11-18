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
import type { Constraint } from '@uilint/core';

/**
 * Login layout lint covers:
 * - header/nav/footer pinned to viewport edges
 * - hero card remains centered and within responsive width bounds
 * - desktop nav items are evenly spaced; on mobile the nav wraps but stays within bounds
 * - footer always sticks to the bottom of the scrollable screen
 */
export const loginLayoutSpec = defineLayoutSpec('example-login', ctx => {
  const header = ctx.el('#app-header');
  const menu = ctx.el('#primary-nav');
  const hero = ctx.el('#hero-panel');
  const footer = ctx.el('#app-footer');
  const navItems = ctx.group('#primary-nav .nav-item');
  const content = ctx.el('#content');

  ctx.mustRef(rt => {
    const viewWidth = rt.view.width;
    const navGroup = rt.group(navItems);
    const constraints: Constraint[] = [
      inside(rt.el(header), rt.view, {
        left: eq(0),
        right: eq(0),
        top: eq(0),
      }),
      inside(rt.el(menu), rt.view, { left: eq(0), right: eq(0) }),
      below(rt.el(menu), rt.el(header), between(0, 8)),
      below(rt.el(hero), rt.el(menu), between(24, 48)),
      centered(rt.el(hero), rt.view, { h: between(-4, 4) }),
      widthIn(rt.el(hero), between(320, 600)),
      inside(rt.el(content), rt.view, { left: eq(0), right: eq(0) }),
      inside(rt.el(footer), rt.canvas, {
        left: eq(0),
        right: eq(0),
        bottom: eq(0),
      }),
      countIs(navGroup, eq(3)),
    ];

    if (viewWidth >= 900) {
      constraints.push(
        alignedHorizontally(navGroup, 4),
        alignedHorizEqualGap(navGroup, 12),
      );
    } else {
      constraints.push(widthIn(rt.el(menu), between(260, rt.el(header).width)));
    }

    return constraints;
  });
});

