# Workflow

## Roles

- **Tech Lead (Claude)**: Creates issues, writes specs, reviews deliverables, moves statuses, accepts/rejects work, keeps `docs/` in sync. Does NOT write code directly — delegates to Codex.
- **Developer (Codex via codex-ctl)**: Implements code, writes tests, fixes bugs. Receives task prompts from Tech Lead. Runs via `codex-ctl spawn` with bypassed approvals.

## Statuses

| Status | Description |
|--------|-------------|
| open | Task created, not yet started |
| spec | Writing or reviewing specification / design (incl. which `docs/` files change) |
| impl | Implementation in progress (Codex working) |
| unit_test | Writing and running vitest unit tests (`pnpm test:core`, hand-built snapshots) |
| audit | Code audit: algorithmic complexity, bloat, bugs, API surface |
| integ_test | Playwright integration tests against reference frontends + example demo |
| blocked | Waiting on dependency or external blocker |
| closed | Done — code built, linted, tested, docs updated, committed and pushed |

## Transitions

```
open ──► spec ──► impl ──► unit_test ──► audit ──► integ_test ──► closed
                   ▲          │            │           │
                   │          ▼            ▼           ▼
                   └──────────┴────────────┴───────────┘
                                (backtrack to impl)

* ──► blocked ──► * (return to previous status)
impl ──► spec (rare: spec error discovered)
```

| From | To | Condition |
|------|-----|-----------|
| open | spec | Work begins — Claude writes/reviews spec |
| spec | impl | Spec approved — Codex starts implementing |
| impl | unit_test | Implementation complete — Codex writes unit tests |
| unit_test | audit | All unit tests pass (`pnpm test:core`) and `pnpm lint` is clean |
| audit | integ_test | Audit clean — no O(N^2), no bloat, no bugs, public API sound |
| integ_test | closed | Playwright integration + example checks pass — docs updated, commit and push |
| impl | spec | Backtrack: implementation reveals spec error or impossibility |
| unit_test | impl | Backtrack: unit test failures require code fix |
| audit | impl | Backtrack: audit finds complexity, bloat, or bugs requiring fix |
| integ_test | impl | Backtrack: integration test failures require code fix |
| * | blocked | Blocker discovered |
| blocked | * | Blocker resolved — return to previous status |

## Backtrack Rules

1. **spec <- impl**: Rare. Only when the spec has an error or is impossible. Default: spec is correct, fix the implementation.
2. **impl <- unit_test**: Test failure means a code bug. Codex fixes code, re-runs `pnpm test:core`.
3. **impl <- audit**: Audit finds O(N^2) algorithms, code bloat, or logic bugs. Codex fixes, Claude re-audits.
4. **impl <- integ_test**: Playwright failure means a runtime/geometry bug. Codex fixes code, re-runs integration tests.

## Testing Order (mandatory)

Tests MUST pass in this order — never jump ahead:

1. **Build**: `pnpm build` — builds `@uilint/core` → `@uilint/playwright` → `@uilint/cli`. Downstream packages consume core's compiled `dist/`, so core must rebuild first.
2. **Lint**: `pnpm lint` — eslint with `--max-warnings=0`.
3. **Unit tests (vitest)**: `pnpm test:core` — core constraint/geometry logic, tested against hand-built `ElemSnapshot`s (no browser).
4. **Playwright integration tests**: `pnpm test:integration` — `tests/integration/` drives a real browser against `examples/reference-frontends/` (adapter, matchers, smoke, reference-frontend specs).
5. **Example end-to-end**: `pnpm lint:layout` — runs the CLI against `examples/uilint-crm-demo/`, exercising config → build → server → scenarios.

Rationale: unit tests catch most logic bugs instantly and need no browser. Integration tests are slower (`pnpm exec playwright install` required once). Never debug a geometry bug in the browser when a hand-built snapshot unit test reproduces it.

## Commit Protocol

When a task reaches `closed`:
1. `pnpm build` succeeds (correct order: core → playwright → cli).
2. `pnpm lint` is clean.
3. `pnpm test:core` passes.
4. `pnpm test:integration` passes.
5. `pnpm lint:layout` passes (if the change affects the CLI or runtime).
6. **`docs/` updated** — if core behavior or public API changed, the matching file in `docs/` (`core-api.md`, `cli-reference.md`, …) is updated in the same change.
7. Commit and push:
   ```bash
   git add <changed files>
   git commit -m "feat|fix|refactor: <description>"
   git push
   ```

## Architecture

- **Type**: pnpm workspace monorepo. TypeScript, Node >= 18.
- **Packages** (layered, under `packages/`):
  - `@uilint/core` — constraint DSL, geometry, evaluation engine. Source is a single file: `packages/uilint-core/src/index.ts`. Never talks to a browser.
  - `@uilint/playwright` — captures DOM geometry into `ElemSnapshot`s, drives pages, adds Playwright matchers.
  - `@uilint/cli` — config-driven orchestrator (`bin: uilint`): build → static server → Chromium → scenarios → reports.
- **Capture/evaluate split**: Playwright captures plain `ElemSnapshot`s; `evaluateLayoutSpecOnSnapshots` (core) runs constraints purely against them. Core has no browser dependency.
- **Frame model**: every snapshot carries `box` (element rect), `view` (viewport), and `canvas` (full document) frames.
- **Specs**: `defineLayoutSpec(ctx => …)` declares named element selectors + constraints. **Scenarios**: `defineScenario(...)` (from `@uilint/cli`) scripts navigation and calls `runtime.snapshot(name, spec)`.
- **Fixtures**: `examples/reference-frontends/` (static HTML for integration tests), `examples/uilint-crm-demo/` (full runnable example with `uilint.config.js`).
- **Docs**: `docs/` — kept current with the public API (cursor/agent rule).

## Developer (Codex) Task Prompt Templates

### Implementation (@uilint/core)
```
Implement <feature/fix>: <description>

Component: @uilint/core
File: packages/uilint-core/src/index.ts (single-file source)
Stack: TypeScript, no browser dependency
CWD: /home/snjax/Documents/projects/ai/uilint

Requirements:
- Follow existing constraint/combinator patterns (see inside, below, alignedHorizontally, tableLayout)
- Constraints are LayoutConstraint factories returning ConstraintSource; they read ElemSnapshots only
- Use Range predicate helpers (eq, between, approx, ...) for tolerances
- Use the box/view/canvas frame the constraint actually needs
- Do NOT add a browser/Playwright dependency to core
- Rebuild after changes: pnpm build:core
```

### Implementation (@uilint/playwright)
```
Implement <feature/fix>: <description>

Component: @uilint/playwright
CWD: /home/snjax/Documents/projects/ai/uilint
Stack: TypeScript, @playwright/test peer dependency

Requirements:
- snapshots.ts captures DOM geometry → ElemSnapshot; runner.ts drives the page; matchers.ts adds test matchers
- Keep core/playwright contract stable — types come from @uilint/core
- Rebuild core first if core types changed: pnpm build:core && pnpm build:playwright
```

### Implementation (@uilint/cli)
```
Implement <feature/fix>: <description>

Component: @uilint/cli
CWD: /home/snjax/Documents/projects/ai/uilint
Stack: TypeScript, bin: uilint

Requirements:
- Follow existing command structure (cli.ts dispatch, layoutCommand.ts, initCommand.ts)
- Viewport presets/groups live in packages/uilint-cli/src/constants.ts
- Config loaded via config.ts / moduleLoader.ts; scenario API in scenarioRuntime.ts
- Rebuild: pnpm build (cli depends on core + playwright dist/)
```

### Unit Tests (vitest)
```
Write unit tests for <path in @uilint/core>

CWD: /home/snjax/Documents/projects/ai/uilint
Run with: pnpm test:core
Single file: pnpm vitest run packages/uilint-core/src/__tests__/<file>.test.ts

Requirements:
- Build ElemSnapshots by hand — see __tests__/testUtils.ts. NO browser.
- Test constraint pass AND fail cases, including tolerance boundaries
- Follow existing test files (relations.position.test.ts, combinators.test.ts, ...)
```

### Integration Tests (Playwright)
```
Write Playwright integration tests for <feature>

CWD: /home/snjax/Documents/projects/ai/uilint
Run: pnpm test:integration
Prerequisite: pnpm exec playwright install (once)

Requirements:
- Tests live in tests/integration/
- Drive a real browser against examples/reference-frontends/ static HTML
- Follow existing patterns (playwright-matchers.spec.ts, reference-frontends.*.spec.ts)
- Use tests/integration/utils/fileUrl.ts to load fixtures
```

### Audit
```
RESEARCH TASK - DO NOT EDIT FILES
Audit <path>

Check for:
1. Algorithmic complexity: find O(N^2) or worse where O(N log N) or O(N) is possible
   (constraint combinators over element groups are the prime suspects)
2. Code bloat: unnecessary abstractions, dead code, over-engineering
3. Bugs: logic errors, edge cases (empty groups, missing/invisible elements), off-by-one in geometry
4. Public API surface: leaked internals, inconsistent naming, missing types
5. Frame correctness: wrong box/view/canvas frame used for a constraint

Do NOT look for: missing features, style issues, or tolerance tuning.
Report findings as a structured list with file:line references.
```

## codex-ctl Usage Patterns

### Spawn for implementation
```bash
ID=$(codex-ctl spawn "<prompt>" --cwd /home/snjax/Documents/projects/ai/uilint | jq -r .session)
codex-ctl state $ID --wait --timeout 600
codex-ctl last $ID
```

### Follow up on same session (preserves context)
```bash
codex-ctl act $ID "<follow-up task>" enter
codex-ctl state $ID --wait --timeout 300
```

### Handle stuck prompts
```bash
codex-ctl screen $ID          # See what's on screen
codex-ctl act $ID enter       # Kick a stuck session
```

### Kill and capture UUID for resume
```bash
UUID=$(codex-ctl kill $ID | jq -r .codex_session_id)
# Later: ID=$(codex-ctl spawn --resume $UUID "new task" | jq -r .session)
```

### Anti-patterns
- **Don't spawn-per-subtask** — use `act` for follow-ups on the same session
- **Don't kill without capturing UUID** — session context is lost
- **Don't skip `state --wait`** — always wait for idle before reading output
- **For research/audit tasks, prefix the prompt with `RESEARCH TASK - DO NOT EDIT FILES`** — otherwise Codex starts implementing
