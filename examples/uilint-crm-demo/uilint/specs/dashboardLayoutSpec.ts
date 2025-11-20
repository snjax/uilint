import {
  alignedHorizEqualGap,
  almostSquared,
  amountOfVisible,
  between,
  centered,
  defineLayoutSpec,
  eq,
  inside,
  tableLayout,
  visible,
  below,
  widthIn,
  forAll,
} from '@uilint/core';
import type { ConstraintSource } from '@uilint/core';

/**
 * Dashboard layout lint ensures:
 * - header & filter rail align with the content container
 * - status cards form a regular grid with balanced gaps and square thumbnails
 * - modal/backdrop stay centered when opened
 * - content rail remains centered and clamped for large viewports while flowing responsively on mobile
 */
export const dashboardLayoutSpec = defineLayoutSpec(ctx => {
  const header = ctx.el('#dashboard-header');
  const filterPanel = ctx.el('#filters-panel');
  const cards = ctx.group('.status-card');
  const icons = ctx.group('.status-card .status-icon');
  const modalBackdrop = ctx.el('#modal-backdrop');
  const modal = ctx.el('#insights-modal');
  const content = ctx.el('#dashboard-content');

  ctx.must(rt => {
    const cardGroup = rt.group(cards);
    const viewportClass = rt.viewportClass;
    const columns = viewportClass === 'desktop' ? 4 : viewportClass === 'tablet' ? 3 : 1;
    const constraints: ConstraintSource[] = [
      visible(header, true),
      inside(filterPanel, content, {
        left: between(0, 32),
        right: between(0, 32),
      }),
      below(filterPanel, header, between(16, 56)),
      centered(content, ctx.view, { h: between(-32, 32) }),
      tableLayout(cards, {
        columns,
        horizontalMargin: between(16, 32),
        verticalMargin: between(16, 32),
      }),
      amountOfVisible(cards, eq(4)),
      forAll(icons, icon => almostSquared(icon, 0.2)),
      visible(modalBackdrop, true),
      visible(modal, true),
      inside(modalBackdrop, ctx.view, {
        left: eq(0),
        right: eq(0),
        top: eq(0),
        bottom: eq(0),
      }),
      centered(modal, ctx.view, { h: between(-24, 24), v: between(-40, 40) }),
      widthIn(modal, between(360, 520)),
    ];

    if (cardGroup[0]) {
      constraints.push(below(cardGroup[0], filterPanel, between(16, 48)));
    }

    if (columns >= 4) {
      constraints.push(alignedHorizEqualGap(cards, 16));
    }

    if (viewportClass === 'desktop') {
      constraints.push(widthIn(content, between(960, 1400)));
    } else if (viewportClass === 'tablet') {
      constraints.push(widthIn(content, between(640, 1100)));
    } else {
      constraints.push(widthIn(content, between(320, 720)));
    }

    return constraints;
  });
});
