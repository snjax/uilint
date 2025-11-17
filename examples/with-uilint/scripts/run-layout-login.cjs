/* eslint-disable @typescript-eslint/no-var-requires */
// @notice CLI script: run login layout spec against local HTML and print LayoutReport JSON to stdout.

const path = require('node:path');
// Enable loading of TypeScript specs from this example project.
require('ts-node/register/transpile-only');
const { chromium } = require('@playwright/test');
const { runLayoutSpec } = require('@uilint/playwright');
// eslint-disable-next-line import/no-unresolved, @typescript-eslint/no-var-requires
const { loginLayoutSpec } = require('../uilint/specs/loginLayoutSpec.ts');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const htmlPath = path.resolve(__dirname, '..', 'frontend', 'index.html');
  const url = `file://${htmlPath}`;
  await page.goto(url);

  const report = await runLayoutSpec(page, loginLayoutSpec, {
    viewportTag: 'cli',
  });

  // Print JSON only, so it is easy to parse by scripts/MCP clients.
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  await browser.close();

  // Non-zero exit code when there are violations (useful in CI/pipelines).
  process.exit(report.violations.length ? 1 : 0);
}

main().catch(err => {
  // Ensure a clear error message for automation.
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


