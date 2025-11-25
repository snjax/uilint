# uilint

**The Layout Linter for Your Frontend**

`uilint` is a tool that verifies the visual layout of your web application. Just as ESLint checks your code for syntax errors, `uilint` checks your page for layout violations—ensuring elements are aligned, responsive, and positioned correctly across all screen sizes.

[![npm version](https://img.shields.io/npm/v/@uilint/core.svg)](https://www.npmjs.com/package/@uilint/core)
[![npm version](https://img.shields.io/npm/v/@uilint/playwright.svg)](https://www.npmjs.com/package/@uilint/playwright)
[![npm version](https://img.shields.io/npm/v/@uilint/cli.svg)](https://www.npmjs.com/package/@uilint/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Why Layout Linting?

CSS is powerful but fragile. A small change in one component can break the layout in another, especially on different viewports. Manual visual QA is slow, and screenshot testing is often flaky and hard to maintain.

`uilint` solves this by letting you define **Layout Specs** in TypeScript. These specs describe the *invariants* of your design (e.g., "header is always at the top", "cards are aligned horizontally"), which `uilint` verifies against your running application.

## Installation

Install the packages from npm:

```bash
# Using npm
npm install --save-dev @uilint/core @uilint/playwright @uilint/cli

# Using pnpm
pnpm add -D @uilint/core @uilint/playwright @uilint/cli

# Using yarn
yarn add -D @uilint/core @uilint/playwright @uilint/cli
```

## Packages

| Package | Description |
|---------|-------------|
| [`@uilint/core`](https://www.npmjs.com/package/@uilint/core) | Constraint DSL, geometry primitives, and runtime engine |
| [`@uilint/playwright`](https://www.npmjs.com/package/@uilint/playwright) | Playwright adapter, runner, and custom matchers |
| [`@uilint/cli`](https://www.npmjs.com/package/@uilint/cli) | Config-driven CLI runner for layout specs |

## Quick Start

Initialize a new project:

```bash
npx @uilint/cli init
```

Run the layout check:

```bash
npx @uilint/cli layout
```

Or if installed locally:

```bash
npx uilint init
npx uilint layout
```

## Documentation

-   **[Getting Started](docs/getting-started.md)**: Installation and your first layout spec.
-   **[CLI Reference](docs/cli-reference.md)**: Configuration, commands, and scenarios.
-   **[Core API](docs/core-api.md)**: Comprehensive reference for constraints (`inside`, `below`, `alignedHorizontally`, etc.).
-   **[Best Practices](docs/best-practices.md)**: Tips for writing robust, maintainable specs.
-   **[Advanced Playwright](docs/advanced-playwright.md)**: Deep dive into the Playwright integration.

## How It Works

1.  **Configure**: Set up `uilint.config.ts` with your project details and viewports.
2.  **Scenario**: Write a simple script to visit a page and take a snapshot.
3.  **Spec**: Define the layout rules for that page.
4.  **Run**: Execute `npx uilint layout` to see if your implementation matches the spec.

## Example

```typescript
// uilint/specs/header.spec.ts
import { defineSpec, inside, below, alignedHorizontally } from '@uilint/core';

export default defineSpec({
  name: 'Header Layout',
  elements: {
    header: '[data-testid="header"]',
    logo: '[data-testid="logo"]',
    nav: '[data-testid="nav"]',
  },
  constraints: ({ header, logo, nav }) => [
    inside(logo, header),
    inside(nav, header),
    alignedHorizontally([logo, nav]),
  ],
});
```

## Development

From the repository root:

```bash
pnpm install
pnpm exec playwright install   # first time only

pnpm lint
pnpm build
pnpm test
```

See `examples/uilint-crm-demo/` for a complete, runnable example.

## License

MIT
