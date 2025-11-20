# uilint

**The Layout Linter for Your Frontend**

`uilint` is a tool that verifies the visual layout of your web application. Just as ESLint checks your code for syntax errors, `uilint` checks your page for layout violations—ensuring elements are aligned, responsive, and positioned correctly across all screen sizes.

## Why Layout Linting?

CSS is powerful but fragile. A small change in one component can break the layout in another, especially on different viewports. Manual visual QA is slow, and screenshot testing is often flaky and hard to maintain.

`uilint` solves this by letting you define **Layout Specs** in TypeScript. These specs describe the *invariants* of your design (e.g., "header is always at the top", "cards are aligned horizontally"), which `uilint` verifies against your running application.

## Key Features

-   **Lint, Don't Just Test**: Run `uilint layout` to check your entire app against defined rules.
-   **Declarative DSL**: Describe *what* the layout should be, not *how* to measure it.
-   **Write Once, Check Everywhere**: Define rules that adapt to mobile, tablet, and desktop automatically.
-   **Fast & Deterministic**: Constraints are evaluated against a static snapshot of the DOM, ensuring stable results without browser flakiness.
-   **CI/CD Ready**: Integrate easily into your build pipeline to catch layout regressions before they merge.

## How It Works

1.  **Configure**: Set up `uilint.config.ts` with your project details and viewports.
2.  **Scenario**: Write a simple script to visit a page and take a snapshot.
3.  **Spec**: Define the layout rules for that page.
4.  **Run**: Execute `npx uilint layout` to see if your implementation matches the spec.

[Get Started →](getting-started.md)
