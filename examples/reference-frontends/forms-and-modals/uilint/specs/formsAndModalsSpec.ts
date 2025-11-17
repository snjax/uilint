import {
  alignedVertically,
  centered,
  defineLayoutSpec,
  between,
  inside,
} from '@uilint/core';

export const formsAndModalsSpec = defineLayoutSpec('reference-forms-and-modals', ctx => {
  const modal = ctx.el('#settings-modal');
  const formFields = ctx.group('#settings-form .form-field');

  ctx.mustRef(rt => [
    centered(rt.el(modal), rt.viewport, { h: between(-10, 10), v: between(-10, 10) }),
    inside(rt.el(modal), rt.viewport, { left: between(0, 400), right: between(0, 400) }),
    alignedVertically(rt.group(formFields), 4),
  ]);
});

