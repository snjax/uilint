import {
  alignedHorizEqualGap,
  almostSquared,
  amountOfVisible,
  between,
  defineLayoutSpec,
  eq,
  tableLayout,
  visible,
  below,
} from '@uilint/core';

export const dashboardLayoutSpec = defineLayoutSpec('example-dashboard', ctx => {
  const header = ctx.el('#dashboard-header');
  const filterPanel = ctx.el('#filters-panel');
  const cards = ctx.group('.status-card');
  const icons = ctx.group('.status-card .status-icon');
  const modalBackdrop = ctx.el('#modal-backdrop');
  const modal = ctx.el('#insights-modal');

  ctx.mustRef(rt => {
    const cardGroup = rt.group(cards);
    const iconGroup = rt.group(icons);
    const constraints = [
      visible(rt.el(header), true),
      tableLayout(cardGroup, {
        columns: 4,
        horizontalMargin: between(16, 32),
        verticalMargin: between(16, 32),
      }),
      alignedHorizEqualGap(cardGroup, 16),
      amountOfVisible(cardGroup, eq(4)),
      ...iconGroup.map(icon => almostSquared(icon, 0.2)),
      visible(rt.el(modalBackdrop), true),
      visible(rt.el(modal), true),
    ];

    if (cardGroup[0]) {
      constraints.push(below(cardGroup[0], rt.el(filterPanel), between(16, 48)));
    }

    return constraints;
  });
});

