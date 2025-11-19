import { defineUilintConfig } from '@uilint/cli';

export default defineUilintConfig({
  layout: {
    distDir: './dist',
    build: 'pnpm build',
    server: {
      host: '127.0.0.1',
      port: 4317,
    },
    scenarios: {
      'crm-happy-path': {
        module: './uilint/scenarios/crmHappyPath.ts',
        viewports: ['mobile', 'desktop'],
      },
    },
  },
});
