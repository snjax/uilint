import {
  alignedHorizontally,
  amountOfVisible,
  between,
  below,
  centered,
  countIs,
  defineLayoutSpec,
  eq,
  inside,
  leftOf,
  tableLayout,
  widthIn,
} from '@uilint/core';
import type { Constraint } from '@uilint/core';

/**
 * CRM layout lint ensures:
 * - KPI strip stays centered and maintains grid rhythm
 * - sidebar/detail behave as two columns on desktop and stack on narrow screens
 * - modules under the detail column keep consistent spacing
 * - status cards/pills keep predictable counts even when responsive
 */
export const crmLayoutSpec = defineLayoutSpec('example-crm', ctx => {
  const header = ctx.el('#crm-header');
  const kpiGrid = ctx.el('#crm-kpis');
  const kpiCards = ctx.group('#crm-kpis .kpi-card');
  const body = ctx.el('#crm-body');
  const sidebar = ctx.el('#crm-sidebar');
  const detail = ctx.el('#crm-detail');
  const profile = ctx.el('#crm-profile-card');
  const orders = ctx.el('#crm-orders');
  const inventory = ctx.el('#crm-inventory');
  const activity = ctx.el('#crm-activity');
  const statusPills = ctx.group('.status-pill');

  ctx.mustRef(rt => {
    const cards = rt.group(kpiCards);
    const pills = rt.group(statusPills);
    const viewportWidth = rt.viewport.width;
    const columns =
      viewportWidth >= 1200 ? 4 : viewportWidth >= 800 ? 3 : viewportWidth >= 520 ? 2 : 1;
    const constraints: Constraint[] = [
      inside(rt.el(header), rt.viewport, { left: between(0, 300), right: between(0, 300) }),
      below(rt.el(kpiGrid), rt.el(header), between(8, 80)),
      inside(rt.el(body), rt.viewport, { left: between(0, 600), right: between(0, 600) }),
      centered(rt.el(kpiGrid), rt.viewport, { h: between(-20, 20) }),
      tableLayout(cards, {
        columns,
        horizontalMargin: between(12, 32),
        verticalMargin: between(12, 32),
      }),
      amountOfVisible(cards, between(4, 4)),
      below(rt.el(profile), rt.el(header), between(120, 1000)),
      below(rt.el(orders), rt.el(profile), between(12, 64)),
      below(rt.el(inventory), rt.el(profile), between(12, 64)),
      below(rt.el(activity), rt.el(inventory), between(12, 64)),
      countIs(pills, between(8, 40)),
    ];

    if (cards[0]) {
      const maxCardWidth = viewportWidth >= 768 ? 340 : Math.min(480, viewportWidth - 32);
      const minCardWidth = viewportWidth >= 768 ? 200 : 180;
      constraints.push(widthIn(cards[0], between(minCardWidth, maxCardWidth)));
    }

    if (viewportWidth >= 900) {
      constraints.push(inside(rt.el(activity), rt.el(detail), { left: between(0, 40), right: between(0, 40) }));
    }

    if (viewportWidth >= 1100) {
      constraints.push(
        inside(rt.el(sidebar), rt.el(body), { top: eq(0) }),
        inside(rt.el(detail), rt.el(body), { top: eq(0) }),
        leftOf(rt.el(sidebar), rt.el(detail), between(12, 64)),
        alignedHorizontally([rt.el(sidebar), rt.el(detail)], 24),
        widthIn(rt.el(sidebar), between(280, 360)),
        widthIn(rt.el(detail), between(640, 1440)),
      );
    } else {
      constraints.push(
        below(rt.el(detail), rt.el(kpiGrid), between(0, 800)),
        below(rt.el(sidebar), rt.el(detail), between(0, 600)),
        centered(rt.el(sidebar), rt.viewport, { h: between(-20, 20) }),
      );
    }

    return constraints;
  });
});

