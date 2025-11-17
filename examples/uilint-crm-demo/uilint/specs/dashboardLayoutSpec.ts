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
} from '@uilint/core';
import type { Constraint } from '@uilint/core';

/**
 * Dashboard layout lint ensures:
 * - header & filter rail align with the content container
 * - status cards form a regular grid with balanced gaps and square thumbnails
 * - modal/backdrop stay centered when opened
 * - content rail remains centered and clamped for large viewports while flowing responsively on mobile
 */
export const dashboardLayoutSpec = defineLayoutSpec('example-dashboard', ctx => {
  const header = ctx.el('#dashboard-header');
  const filterPanel = ctx.el('#filters-panel');
  const cards = ctx.group('.status-card');
  const icons = ctx.group('.status-card .status-icon');
  const modalBackdrop = ctx.el('#modal-backdrop');
  const modal = ctx.el('#insights-modal');
  const content = ctx.el('#dashboard-content');

  ctx.mustRef(rt => {
    const cardGroup = rt.group(cards);
    const iconGroup = rt.group(icons);
    const viewportWidth = rt.viewport.width;
    const columns =
      viewportWidth >= 1200 ? 4 : viewportWidth >= 800 ? 3 : viewportWidth >= 520 ? 2 : 1;
    const constraints: Constraint[] = [
      visible(rt.el(header), true),
      inside(rt.el(filterPanel), rt.el(content), {
        left: between(0, 32),
        right: between(0, 32),
      }),
      below(rt.el(filterPanel), rt.el(header), between(16, 56)),
      centered(rt.el(content), rt.viewport, { h: between(-32, 32) }),
      tableLayout(cardGroup, {
        columns,
        horizontalMargin: between(16, 32),
        verticalMargin: between(16, 32),
      }),
      amountOfVisible(cardGroup, eq(4)),
      ...iconGroup.map(icon => almostSquared(icon, 0.2)),
      visible(rt.el(modalBackdrop), true),
      visible(rt.el(modal), true),
      inside(rt.el(modalBackdrop), rt.viewport, {
        left: eq(0),
        right: eq(0),
        top: eq(0),
        bottom: eq(0),
      }),
      centered(rt.el(modal), rt.viewport, { h: between(-24, 24), v: between(-40, 40) }),
      widthIn(rt.el(modal), between(360, 520)),
    ];

    if (cardGroup[0]) {
      constraints.push(below(cardGroup[0], rt.el(filterPanel), between(16, 48)));
    }

    if (columns >= 4) {
      constraints.push(alignedHorizEqualGap(cardGroup, 16));
    }

    if (viewportWidth >= 1200) {
      constraints.push(widthIn(rt.el(content), between(960, 1400)));
    } else {
      constraints.push(widthIn(rt.el(content), between(320, viewportWidth + 32)));
    }

    return constraints;
  });
});

