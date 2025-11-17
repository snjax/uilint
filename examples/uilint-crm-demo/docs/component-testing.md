## Component Testing Strategy (no sockets required)

The goal is to let multiple agents (or contributors) prototype features in parallel without having to coordinate over a shared dev server or long‑lived websocket connection.

### Tooling

- **Vitest** – runs Svelte components in `jsdom`, so there is no dev server to keep alive.
- **@testing-library/svelte** – renders the component and gives user-centric queries.
- **@testing-library/jest-dom** – richer assertions (`toBeInTheDocument`, `toHaveTextContent`, etc.).

All of this is wired through `vitest.config.ts`:

```ts
export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./component-tests/setupTests.ts'],
  },
});
```

### Sample tests

`component-tests/login-page.test.ts` and `component-tests/crm-page.test.ts` show two patterns:

1. **Structure checks** – ensure nav items, hero card, KPI grid, etc. render without hydration errors.
2. **Behaviour checks** – simulate button clicks with `user-event` and assert side effects (redirects, state changes) without ever opening a socket or booting Vite’s dev server.

### Running the suite

From `examples/uilint-crm-demo`:

```bash
pnpm test:components         # single pass
pnpm test:components:watch   # TDD loop
```

Because the suite uses jsdom it scales well for multi-branch, multi-agent work: each agent renders the component tree locally, the tests complete in milliseconds, and there is zero contention over dev server ports or websocket channels.

