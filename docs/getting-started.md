# Getting Started

This guide will walk you through setting up `uilint` from scratch. By the end, you'll have a working layout linter that checks your application for visual regressions.

## Installation

Install the CLI and core packages as dev dependencies:

```bash
npm install -D @uilint/cli @uilint/core
# or
pnpm add -D @uilint/cli @uilint/core
```

## Initialization

The easiest way to configure your project is to use the `init` command. This will create a configuration file and a sample folder structure.

```bash
npx uilint init
```

This command creates:
-   `uilint.config.ts`: The main configuration file.
-   `uilint/specs/`: Directory for your layout specifications.
-   `uilint/scenarios/`: Directory for your test scenarios.
-   `uilint/specs/example.ts` & `uilint/scenarios/example.ts`: Sample files to get you started.

### 4. Make it Responsive

Real-world apps behave differently on mobile and desktop. Use `ctx.viewportClass` to adapt your constraints.

```ts
// uilint/specs/responsiveSpec.ts
import { defineLayoutSpec, widthIn, between, inside, eq } from '@uilint/core';

export const responsiveSpec = defineLayoutSpec((ctx) => {
  const content = ctx.el('#content');
  const sidebar = ctx.el('#sidebar');

  ctx.must((rt) => {
    const constraints = [];
    
    // Common constraints
    constraints.push(inside(content, ctx.view, { top: eq(0) }));

    if (rt.viewportClass === 'desktop') {
      // Desktop: Sidebar is visible and content is wide
      constraints.push(
        widthIn(content, between(800, 1200)),
        inside(sidebar, ctx.view, { left: eq(0) })
      );
    } else {
      // Mobile: Content takes full width, sidebar is hidden
      constraints.push(
        widthIn(content, between(300, 600))
        // Sidebar might be hidden or off-canvas
      );
    }

    return constraints;
  });
});
```

## Step-by-Step Guide

If you prefer to set things up manually or want to understand what `init` did, follow these steps.

### 1. Configuration (`uilint.config.ts`)

This file tells `uilint` how to build/serve your app and where to find your tests.

```ts
import { defineUilintConfig } from '@uilint/cli';

export default defineUilintConfig({
  layout: {
    // 1. Build Command: How do we build your app for production?
    build: 'npm run build',
    
    // 2. Dist Directory: Where does the build output go?
    distDir: './dist',
    
    // 3. Server: Options for the local server that will host your app during testing
    server: {
      port: 3000,
    },
    
    // 4. Scenarios: Map scenario names to their definition files
    scenarios: {
      'homepage': {
        module: './uilint/scenarios/homepage.ts',
        viewports: ['mobile', 'desktop'],
      },
    },
  },
});
```

### 2. Writing a Layout Spec

A **Layout Spec** is the heart of `uilint`. It describes the *rules* your UI must follow. Think of it as a contract: "The header must be at the top, 60px tall, and contain a logo."

Create `uilint/specs/homeSpec.ts`:

```ts
import { defineLayoutSpec, inside, eq, centered, below, between } from '@uilint/core';

export const homeSpec = defineLayoutSpec((ctx) => {
  // 1. Identify Elements
  // Use robust CSS selectors.
  const header = ctx.el('header');
  const logo = ctx.el('.logo');
  const main = ctx.el('main');

  // 2. Define Constraints
  // Describe the relationships between elements.
  ctx.must(
    // Header is pinned to the top of the viewport
    inside(header, ctx.view, { top: eq(0), left: eq(0), right: eq(0) }),
    
    // Logo is centered within the header
    centered(logo, header),
    
    // Main content is below the header with a gap between 0 and 20px
    below(main, header, between(0, 20))
  );
});
```

### 3. Writing a Scenario

A **Scenario** is a script that drives the browser to the state you want to test. It's like a mini-Playwright test that ends with a snapshot.

Create `uilint/scenarios/homepage.ts`:

```ts
import { defineScenario } from '@uilint/cli';
import { homeSpec } from '../specs/homeSpec';

export default defineScenario('homepage', async (runtime) => {
  // 1. Navigate
  // The URL is relative to your served app (localhost:3000)
  await runtime.goto('/');
  
  // 2. Wait (Optional but recommended)
  // Ensure the page is fully loaded before snapshotting
  await runtime.page.waitForSelector('main');
  
  // 3. Snapshot
  // Capture the state and validate it against 'homeSpec'
  await runtime.snapshot('home-snapshot', homeSpec);
});
```

## Running the Linter

Now you're ready to lint!

```bash
npx uilint layout
```

This command will:
1.  Run your `build` command.
2.  Start a static server in `distDir`.
3.  Launch a headless browser.
4.  Execute the `homepage` scenario on `mobile` and `desktop` viewports.
5.  Report any violations found.

## Why This Matters

By defining layout as code, you catch regressions that manual testing misses. Did a CSS change accidentally push the footer up? Did the mobile menu break on tablet? `uilint` catches these issues instantly, ensuring your UI remains pixel-perfect (or rather, *constraint-perfect*) across all devices.
