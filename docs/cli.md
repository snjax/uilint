## uilint CLI

The `@uilint/cli` package provides a config-driven runner around Playwright + uilint. It discovers a `uilint.config.{ts,js}` file in the current working directory and executes the configured specs across one or more viewports.

### Installation

Add the package alongside `@uilint/core` and `@uilint/playwright`:

```bash
pnpm add -D @uilint/core @uilint/playwright @uilint/cli @playwright/test
pnpm exec playwright install
```

### Configuration file

Create `uilint.config.ts` (or `.js`) in your project root. Use `defineUilintConfig` to describe how to build/serve the app and which **scenarios** should run:

```ts
import { defineUilintConfig } from '@uilint/cli';

export default defineUilintConfig({
  layout: {
    distDir: './dist',
    build: 'pnpm build',
    server: { host: '127.0.0.1', port: 4317 },
    scenarios: {
      'crm-happy-path': {
        module: './uilint/scenarios/crmHappyPath.ts',
        viewports: ['mobile', 'desktop'],
      },
      'crm-modal-regression': {
        module: './uilint/scenarios/crmModal.ts',
      },
    },
  },
});
```

- `distDir` — folder served over HTTP (relative to the config file).
- `build` — shell command or async function executed before the run.
- `server` — optional overrides for host/port.
- `scenarios` — map of Playwright scripts; each is a user journey that can take one or more layout snapshots.
- `viewports` / `viewportGroups` — optional overrides; the CLI already ships the full preset matrix (mobile, tablet, desktop, 4K) so you usually only extend this for app-specific viewports.

### Writing a scenario

Scenarios are plain Playwright scripts. Use `defineScenario` for type safety and call `runtime.snapshot(name, layoutSpec)` whenever you want to capture the current DOM state:

```ts
// uilint/scenarios/crmHappyPath.ts
import { defineScenario } from '@uilint/cli';
import { loginLayoutSpec } from '../specs/loginLayoutSpec';
import { dashboardLayoutSpec } from '../specs/dashboardLayoutSpec';
import { crmLayoutSpec } from '../specs/crmLayoutSpec';

export default defineScenario(async runtime => {
  await runtime.goto('index.html');
  await runtime.snapshot('login', loginLayoutSpec);

  await runtime.goto('dashboard.html');
  await runtime.snapshot('dashboard', dashboardLayoutSpec);

  await runtime.goto('crm.html');
  await runtime.snapshot('crm', crmLayoutSpec);
});
```

- `runtime.goto(path)` navigates relative to the served `dist/` (absolute URLs are also supported).
- `runtime.snapshot(name, spec, options?)` runs `runLayoutSpec` under the hood and streams a `LayoutReport` to stdout (view tags default to `<scenario>-<viewport>-<name>`).
- Access `runtime.page` directly for clicks, scrolling, etc. before taking the next snapshot.

### Running the CLI

From the project root run:

```bash
npx uilint layout
```

In monorepos or tooling repos you can keep the config alongside a specific frontend and invoke the linter from anywhere by pointing to that file:

```bash
pnpm exec uilint layout --config examples/uilint-crm-demo/uilint.config.js
```

Useful flags:

- `--scenario crm-happy-path` — run a single scenario (default: all scenarios in the config).
- `--viewport 1280x720` — run a single custom viewport.
- `--viewports mobile,ipad-pro-12-9` — pick presets, groups, or custom entries (`modal=1200x700`).
- `--workers 4` — control Playwright concurrency.
- `--format compact` — one-line JSON per report (default: pretty `json`).
- `--skip-build` — reuse an existing `dist/` folder.
- `--config path/to/uilint.config.ts` — custom config location.

Each (spec × viewport) emits a `LayoutReport` JSON line. The process exits with code `1` when any report contains violations.

### Default viewports

The runner ships with an exhaustive preset list covering phones, tablets, laptops, ultra-wide, and 4K displays. All presets run by default, so you rarely need to duplicate them in `uilint.config.*`. Use `--viewports` or `--viewport` (or scenario-level `viewports`) to narrow the selection or add ad-hoc dimensions via `name=WIDTHxHEIGHT` tokens.
