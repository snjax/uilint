# with-uilint example

A minimal demo project that shows how to combine uilint with Playwright. The project contains:

- `frontend/` – static HTML pages that simulate a login flow and a dashboard with cards + modal.
- `uilint/specs/` – layout specs for the login and dashboard screens.
- `playwright/` – Playwright config + tests that open the static pages (via `file://` URLs), execute realistic flows, and verify layouts using the uilint matcher.

## Running the example

```bash
pnpm install
pnpm exec playwright install # first time only
pnpm test
```

From the repository root you can run `pnpm test:example`, which filters to this package. Tests use the custom `toMatchLayout` matcher so failures automatically attach `LayoutReport` JSON to Playwright output.

