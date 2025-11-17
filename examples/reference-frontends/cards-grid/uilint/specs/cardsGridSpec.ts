import {
  almostSquared,
  amountOfVisible,
  countIs,
  defineLayoutSpec,
  eq,
  tableLayout,
  between,
  widthIn,
} from '@uilint/core';

export const cardsGridSpec = defineLayoutSpec('reference-cards-grid', ctx => {
  const cards = ctx.group('.card');
  const images = ctx.group('.card .card-image');

  ctx.mustRef(rt => [
    tableLayout(rt.group(cards), {
      columns: 4,
      horizontalMargin: between(16, 32),
      verticalMargin: between(16, 32),
    }),
    amountOfVisible(rt.group(cards), eq(4)),
    countIs(rt.group(cards), eq(4)),
    ...rt.group(images).map(image => almostSquared(image, 0.2)),
    ...rt.group(cards).map(card => widthIn(card, between(250, 320))),
  ]);
});

