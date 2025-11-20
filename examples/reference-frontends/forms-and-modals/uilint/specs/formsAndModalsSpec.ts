import {
  alignedVertically,
  centered,
  defineLayoutSpec,
  between,
  inside,
} from '@uilint/core';

export const formsAndModalsSpec = defineLayoutSpec(ctx => {
  const modal = ctx.el('#settings-modal');
  const formFields = ctx.group('#settings-form .form-field');

  ctx.must(
    centered(modal, ctx.view, { h: between(-10, 10), v: between(-10, 10) }),
    inside(modal, ctx.view, { left: between(0, 400), right: between(0, 400) }),
    alignedVertically(formFields, 4),
  );
});
