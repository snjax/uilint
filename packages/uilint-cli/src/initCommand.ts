import * as fs from 'fs';
import * as path from 'path';

export async function runInitCommand(): Promise<number> {
  const cwd = process.cwd();
  const configPathTs = path.join(cwd, 'uilint.config.ts');
  const configPathJs = path.join(cwd, 'uilint.config.js');

  if (fs.existsSync(configPathTs) || fs.existsSync(configPathJs)) {
    // eslint-disable-next-line no-console
    console.log('uilint configuration already exists. Skipping initialization.');
    return 0;
  }

  // eslint-disable-next-line no-console
  console.log('Initializing uilint...');

  // Create directories
  const uilintDir = path.join(cwd, 'uilint');
  const specsDir = path.join(uilintDir, 'specs');
  const scenariosDir = path.join(uilintDir, 'scenarios');

  fs.mkdirSync(specsDir, { recursive: true });
  fs.mkdirSync(scenariosDir, { recursive: true });

  // Create sample spec
  const sampleSpecPath = path.join(specsDir, 'homeLayout.ts');
  const sampleSpecContent = `import { defineLayoutSpec, below, inside, eq, between } from '@uilint/core';

export const homeLayout = defineLayoutSpec((ctx) => {
  const header = ctx.el('header');
  const main = ctx.el('main');
  const footer = ctx.el('footer');

  ctx.must(
    inside(header, ctx.view, { top: eq(0), left: eq(0) }),
    below(main, header, between(0, 20)),
    below(footer, main, between(20, 100))
  );
});
`;
  fs.writeFileSync(sampleSpecPath, sampleSpecContent);

  // Create sample scenario
  const sampleScenarioPath = path.join(scenariosDir, 'homeScenario.ts');
  const sampleScenarioContent = `import { defineScenario } from '@uilint/cli';
import { homeLayout } from '../specs/homeLayout';

export default defineScenario({
  async run({ page, snapshot }) {
    await page.goto('/');
    await snapshot('Home', homeLayout);
  },
});
`;
  fs.writeFileSync(sampleScenarioPath, sampleScenarioContent);

  // Create config file
  const configContent = `import { defineUilintConfig } from '@uilint/cli';

export default defineUilintConfig({
  layout: {
    scenarios: {
      home: './uilint/scenarios/homeScenario.ts',
    },
    // server: {
    //   command: 'npm run dev', // Command to start your dev server
    //   url: 'http://localhost:3000', // URL where the server is accessible
    //   timeout: 30000,
    // },
    // viewports: {
    //   desktop: { width: 1280, height: 800 },
    //   mobile: { width: 375, height: 667 },
    // },
  },
});
`;
  fs.writeFileSync(configPathTs, configContent);

  // eslint-disable-next-line no-console
  console.log('uilint initialized successfully!');
  // eslint-disable-next-line no-console
  console.log('Created uilint.config.ts');
  // eslint-disable-next-line no-console
  console.log('Created uilint/specs/homeLayout.ts');
  // eslint-disable-next-line no-console
  console.log('Created uilint/scenarios/homeScenario.ts');
  // eslint-disable-next-line no-console
  console.log('\nNext steps:');
  // eslint-disable-next-line no-console
  console.log('1. Configure your server command in uilint.config.ts');
  // eslint-disable-next-line no-console
  console.log('2. Run: npx uilint layout');

  return 0;
}

