import { describe, expect, it } from 'vitest';
import { defineLayoutSpec, widthIn, gt } from '../index.js';
import type { LayoutSpec } from '../index.js';

describe('Layout spec definition', () => {
  it('registers elements, groups, and factories', () => {
    const spec: LayoutSpec = defineLayoutSpec('Sample spec', ctx => {
      const header = ctx.el('#header');
      const cards = ctx.group('.card');

      ctx.mustRef(rt => widthIn(rt.el(header), gt(0)));
      ctx.mustRef(rt =>
        widthIn(rt.group(cards)[0] ?? rt.el(header), gt(0)),
      );
    });

    expect(spec.name).toBe('Sample spec');
    expect(Object.keys(spec.elements).length).toBeGreaterThanOrEqual(3); // includes view/canvas
    expect(Object.keys(spec.groups).length).toBe(1);
    expect(spec.factories.length).toBe(2);
    expect(spec.viewKey).toBe('__uilint.view');
    expect(spec.canvasKey).toBe('__uilint.canvas');
  });
});

