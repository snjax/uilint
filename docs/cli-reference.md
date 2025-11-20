# CLI Reference

The `@uilint/cli` package provides the command-line interface for running layout tests. It orchestrates building your app, serving it, and executing scenarios across multiple viewports.

## Commands

### `uilint init`

Initializes a new uilint project in the current directory.

**What it does:**
-   Creates `uilint.config.ts`.
-   Creates `uilint/specs/` and `uilint/scenarios/` directories.
-   Adds example files to help you get started.

**Usage:**
```bash
npx uilint init
```

### `uilint layout`

Runs the layout linter.

**Usage:**
```bash
npx uilint layout [options]
```

**Options:**

-   `--scenario <name>`: Run only a specific scenario (default: `all`).
-   `--viewport <name=WxH>`: Override viewport for this run.
    ```bash
    npx uilint layout --viewport mobile
    npx uilint layout --viewport custom=500x500
    ```
-   `--viewports <list>`: Run on a specific list of viewports (comma-separated).
    ```bash
    npx uilint layout --viewports mobile,desktop
    ```
-   `--skip-build`: Skip the build step (useful for local dev if server is already running).
-   `--format <type>`: Output format (`json` or `compact`). Default is `json` if violations found.
-   `--workers <n>`: Number of parallel workers (default: CPU count).
-   `--debug`: Enable debug logging.

## Configuration

The CLI looks for `uilint.config.ts` (or `.js`, `.mjs`, `.mts`) in the current directory.

```ts
import { defineUilintConfig } from '@uilint/cli';

export default defineUilintConfig({
  layout: {
    // 1. Build Command (Optional)
    // The command to build your application for production.
    // If omitted, uilint assumes the app is already built.
    build: 'npm run build',
    
    // 2. Dist Directory (Required if using built-in server)
    // The directory containing your static assets (index.html, etc.).
    distDir: './dist',
    
    // 3. Server Options
    server: {
      // Hostname to bind to (default: 127.0.0.1)
      host: '127.0.0.1',
      // Port to listen on (default: random free port)
      port: 3000,
    },
    
    // 4. Scenarios Definition
    scenarios: {
      'homepage': {
        module: './uilint/scenarios/homepage.ts',
        viewports: ['mobile', 'desktop'], // Run on these viewports
      },
      'dashboard': {
        module: './uilint/scenarios/dashboard.ts',
        viewports: ['desktop'], // Only run on desktop
      }
    },
    
    // 5. Custom Viewports (Optional)
    viewports: {
      'ultrawide': { width: 2560, height: 1080 },
      'tiny': { width: 320, height: 480 },
    },
    
    // 6. Viewport Groups (Optional)
    viewportGroups: {
      'all-mobile': ['mobile', 'tiny'],
    }
  },
});
```

### Built-in Viewports

-   `mobile`: 375x667
-   `tablet`: 768x1024
-   `desktop`: 1280x800

## Scenarios

A **Scenario** is a script that drives the browser to a specific state and captures snapshots.

```ts
import { defineScenario } from '@uilint/cli';
import { mySpec } from '../specs/mySpec';

export default defineScenario('my-scenario', async (runtime) => {
  // Access the underlying Playwright page
  const page = runtime.page;
  
  // Navigate
  // The URL is relative to the server root
  await runtime.goto('/login');
  
  // Interact using Playwright API
  await page.fill('#username', 'admin');
  await page.fill('#password', 'secret');
  await page.click('#login-btn');
  
  // Wait for the next page to load
  await page.waitForURL('/dashboard');
  await page.waitForSelector('.dashboard-grid');
  
  // Snapshot
  // The snapshot name ('dashboard-view') will be used in the report
  await runtime.snapshot('dashboard-view', mySpec);
});
```

### `runtime` API

-   **`runtime.page`**: The Playwright `Page` instance.
-   **`runtime.viewport`**: The current viewport being tested (`{ name, size }`).
-   **`runtime.viewportClass`**: The class of the current viewport (`'mobile' | 'tablet' | 'desktop'`).
-   **`runtime.baseUrl`**: The base URL of the local server.
-   **`runtime.goto(path, options?)`**: Navigates to a path relative to `baseUrl`.
-   **`runtime.snapshot(name, spec, options?)`**: Captures a snapshot.
    -   `options.viewTag`: Custom tag for the snapshot (default: generated from scenario/viewport/name).
    -   `options.viewportClass`: Override viewport class.

## Output Formats

### JSON (Default)
Outputs a structured JSON array of violations if any are found.

### Compact
Outputs a one-line JSON summary per violation, suitable for log parsing.
```bash
npx uilint layout --format compact
```
