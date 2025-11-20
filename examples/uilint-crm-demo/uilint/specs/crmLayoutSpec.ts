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
import type { ConstraintSource } from '@uilint/core';

/**
 * CRM layout lint ensures:
 * - KPI strip stays centered and maintains grid rhythm
 * - sidebar/detail behave as two columns on desktop and stack on narrow screens
 * - modules under the detail column keep consistent spacing
 * - status cards/pills keep predictable counts even when responsive
 */
export const crmLayoutSpec = defineLayoutSpec(ctx => {
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

  ctx.must(rt => {
    const cards = rt.group(kpiCards);
    const pills = rt.group(statusPills);
    const viewportClass = rt.viewportClass;
    const isDesktop = viewportClass === 'desktop';
    const isTablet = viewportClass === 'tablet';
    const columns = isDesktop ? 4 : isTablet ? 2 : 1;
    const maxBodyMargin = isDesktop ? 1200 : isTablet ? 400 : 32;

    const constraints: ConstraintSource[] = [
      inside(header, ctx.view, { left: between(0, 300), right: between(0, 300) }),
      below(kpiGrid, header, between(8, 80)),
      inside(body, ctx.view, { left: between(0, maxBodyMargin), right: between(0, maxBodyMargin) }),
      centered(kpiGrid, ctx.view, { h: between(-20, 20) }),
      tableLayout(cards, {
        columns,
        horizontalMargin: between(12, 32),
        verticalMargin: between(12, 32),
      }),
      amountOfVisible(cards, between(4, 4)),
      below(profile, header, between(120, 1000)),
      below(orders, profile, between(12, 64)),
      below(inventory, profile, between(12, 64)),
      below(activity, inventory, between(12, 64)),
      countIs(pills, between(8, 40)),
    ];

    if (cards[0]) {
      const [minCardWidth, maxCardWidth] = isDesktop ? [200, 340] : isTablet ? [180, 320] : [160, 360];
      constraints.push(widthIn(cards[0], between(minCardWidth, maxCardWidth)));
    }

    if (viewportClass !== 'mobile') {
      constraints.push(inside(activity, detail, { left: between(0, 40), right: between(0, 40) }));
    }

    if (isDesktop) {
      constraints.push(
        inside(sidebar, body, { top: eq(0) }),
        inside(detail, body, { top: eq(0) }),
        leftOf(sidebar, detail, between(12, 64)),
        alignedHorizontally([sidebar, detail], 24),
        widthIn(sidebar, between(280, 360)),
        widthIn(detail, between(640, 1440)),
      );
    } else {
      constraints.push(
        below(detail, kpiGrid, between(0, 800)),
        below(sidebar, detail, between(0, 600)),
        centered(sidebar, ctx.view, { h: between(-20, 20) }),
      );
    }

    return constraints;
  });
});
