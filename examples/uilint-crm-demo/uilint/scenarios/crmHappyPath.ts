import { defineScenario } from '@uilint/cli';
import { loginLayoutSpec } from '../specs/loginLayoutSpec.ts';
import { dashboardLayoutSpec } from '../specs/dashboardLayoutSpec.ts';
import { crmLayoutSpec } from '../specs/crmLayoutSpec.ts';

export default defineScenario(async runtime => {
  // Login screen
  await runtime.goto('index.html');
  await runtime.snapshot('login', loginLayoutSpec);

  // Dashboard with modal open when available
  await runtime.goto('dashboard.html');
  const insightsButton = runtime.page.getByRole('button', { name: /open insights/i });
  if ((await insightsButton.count()) > 0) {
    try {
      await insightsButton.first().click();
      await runtime.page.waitForTimeout(100);
    } catch (error) {
      console.warn('[uilint] unable to open dashboard modal:', error?.message ?? error);
    }
  }
  await runtime.snapshot('dashboard', dashboardLayoutSpec);

  // CRM board view
  await runtime.goto('crm.html');
  await runtime.snapshot('crm', crmLayoutSpec);
});
