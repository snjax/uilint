import {
  almostSquared,
  amountOfVisible,
  countIs,
  defineLayoutSpec,
  eq,
  tableLayout,
  between,
  widthIn,
  forAll,
} from '@uilint/core';

export const cardsGridSpec = defineLayoutSpec(ctx => {
  const cards = ctx.group('.card');
  const images = ctx.group('.card .card-image');

  ctx.must(
    tableLayout(cards, {
      columns: 4,
      horizontalMargin: between(16, 32),
      verticalMargin: between(16, 32),
    }),
    amountOfVisible(cards, eq(4)),
    countIs(cards, eq(4)),
    forAll(images, image => almostSquared(image, 0.2)),
    forAll(cards, card => widthIn(card, between(250, 320))),
  );
});
