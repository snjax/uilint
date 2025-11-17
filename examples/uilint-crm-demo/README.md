# uilint CRM demo

`examples/uilint-crm-demo` is a Vite + Svelte playground that demonstrates how to wire uilint into a modern UI workflow without spinning up extra socket-based dev servers.

- `src/` – Svelte components for the login screen (`index.html`), dashboard (`dashboard.html`) and a richer CRM control panel (`crm.html`).
- `uilint/specs/` – layout specs for every page, including the CRM scenario with complex constraints.
- `playwright/` – config + tests that run against a `vite preview` server and reuse the custom `toMatchLayout` matcher.
- `component-tests/` – socket-free component tests powered by Vitest + Testing Library to validate pieces of the UI in isolation.
- `scripts/run-layout.cjs` – post-render CLI that builds the project, serves the static output, runs a chosen layout spec with Playwright, and prints machine-readable JSON (handy for MCP/LLM agents).

## Install & develop

```bash
cd examples/uilint-crm-demo
pnpm install
pnpm exec playwright install   # once

# iterate locally
pnpm dev
```

## Quality gates

```bash
pnpm lint                # svelte-check
pnpm test                # Playwright E2E + layout linting
pnpm test:components     # Vitest + @testing-library/svelte (no sockets)
```

Playwright automatically spins up `vite preview --strictPort`, so every suite runs against the same static assets used in production builds.

Component-test details live in [`docs/component-testing.md`](docs/component-testing.md).

## Layout lint scripts

Each page can be linted (post-render) without touching Playwright UI code. По умолчанию `pnpm layout:check` прогоняет **все** страницы последовательно и для каждой страницы проверяет несколько responsive viewport’ов (mobile, tablet, MacBook Air, MacBook Pro, wide, ultra wide, 4k):

```bash
pnpm layout:login
pnpm layout:dashboard
pnpm layout:crm
pnpm layout:check        # прогоняет все страницы последовательно

# кастомные сценарии: ограничить список viewport’ов или задать точный размер
pnpm layout:check -- --spec=crm --viewports=mobile,macbook-pro
pnpm layout:check -- --viewport=1440x960 --format=compact
```

From the repo root (multi-agent friendly) you can stream the lint log directly to stdout:

```bash
pnpm --filter uilint-crm-demo run layout:login
pnpm --filter uilint-crm-demo run layout:check   # JSON по каждой странице подряд
```

You will see a JSON `LayoutReport` for the requested page (e.g. login). The script:

1. Builds the app unless `--skip-build` is supplied.
2. Serves the static `dist/` output.
3. For each requested viewport it launches headless Playwright, применяет сценарные шаги (например, открывает dashboard modal), снимает снапшоты и прогоняет соответствующий `LayoutSpec`.
4. Prints every `LayoutReport` (страница × viewport) в JSON и завершаетcя c кодом `1`, если хотя бы один отчёт содержит нарушения.

Т.к. вывод — чистый JSON, его удобно использовать и как multiscreen QA канал для MCP/LLM агентов или CI: достаточно прочитать stdout и среагировать на любые failing viewports.

