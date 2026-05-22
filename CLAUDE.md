# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`uilint` is a layout linter for web frontends — "ESLint for visual layout". Users declare *layout specs* (geometric invariants like "logo is inside header", "cards are aligned") in TypeScript and `uilint` verifies them against a running app across many viewports. It is conceptually a TypeScript/Playwright reimagining of the Galen Framework.

## Commands

This is a pnpm workspace monorepo. Run from the repo root.

```bash
pnpm install
pnpm exec playwright install   # first time only

pnpm build                     # builds core → playwright → cli, in that order
pnpm lint                      # eslint, --max-warnings=0
pnpm test                      # test:core + test:playwright
```

- **Single unit test (core):** `pnpm vitest run packages/uilint-core/src/__tests__/relations.position.test.ts` (or `pnpm vitest run -t "test name"`).
- **Integration tests** (Playwright, in `tests/integration/`): `pnpm test:integration`.
- **Run the example end-to-end:** `pnpm lint:layout` runs the CLI against `examples/uilint-crm-demo/`.
- Build order matters: `@uilint/playwright` and `@uilint/cli` depend on `@uilint/core`'s compiled `dist/`. After editing core, rebuild it before testing the other packages.

## Architecture

Three published packages under `packages/`, layered:

- **`@uilint/core`** — the entire constraint DSL, geometry, and evaluation engine. Despite the multi-file `dist/`, the source is a **single file**: `packages/uilint-core/src/index.ts` (~72KB). All constraint functions (`inside`, `below`, `alignedHorizontally`, `tableLayout`, etc.), the `Range` predicate helpers (`eq`, `between`, `approx`, …), and `defineLayoutSpec` live here. Core never talks to a browser.
- **`@uilint/playwright`** — bridges core to a real browser. `snapshots.ts` captures DOM geometry into `ElemSnapshot`s; `runner.ts` (`runLayoutSpec`) drives a page; `matchers.ts` adds Playwright test matchers (`toMatchLayout`, `assertLayout`).
- **`@uilint/cli`** — config-driven orchestrator. `bin: uilint`. Reads `uilint.config.{ts,js}`, runs the build step, starts a static server over `distDir`, launches Chromium, executes scenarios across viewports, prints reports.

### The key design split: capture vs. evaluate

Constraints never touch the DOM. The flow is two-phase:

1. **Capture** — Playwright reads element geometry into plain `ElemSnapshot` objects (the `SnapshotStore`).
2. **Evaluate** — `evaluateLayoutSpecOnSnapshots` (in core) runs the spec's constraints purely against those snapshots.

This is why core has no browser dependency and why core constraints are tested with hand-built snapshots (see `__tests__/testUtils.ts`).

### Frame model

Every `ElemSnapshot` carries three coordinate frames; constraints choose which they need:
- `box` — element rect relative to the viewport.
- `view` — the viewport rect (scroll position + inner size).
- `canvas` — the full scrollable document rect.

### Specs and scenarios

- A **spec** is built via `defineLayoutSpec(ctx => { ... })` — declares named elements (selectors) and constraints. (Note: the README's `defineSpec({ elements, constraints })` snippet is illustrative; the actual export is `defineLayoutSpec` with a builder — verify current docs in `docs/core-api.md`.)
- A **scenario** (`defineScenario`, from `@uilint/cli`'s `scenarioRuntime`) is a script that navigates pages and calls `runtime.snapshot(name, spec)` to check a spec at the current point.
- Viewports: presets and groups (`mobile`/`tablet`/`desktop`) are defined in `packages/uilint-cli/src/constants.ts`.

## Conventions

- **All code, comments, and docs in English.** Answer the user in their language, but generated files are English.
- **Keep `docs/` current.** When you change core library behavior or its public API, update the matching file in `docs/` in the same change (`core-api.md`, `cli-reference.md`, etc.).
- Use Context7 MCP for up-to-date library docs (Playwright, Galen Framework) when needed.

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts. `cp`, `mv`, and `rm` may be aliased to `-i` (interactive) mode on some systems, which causes agents to hang waiting for y/n input.

```bash
cp -f source dest          # NOT: cp source dest
mv -f source dest          # NOT: mv source dest
rm -f file                 # NOT: rm file
rm -rf directory           # NOT: rm -r directory
cp -rf source dest         # NOT: cp -r source dest
```

Other commands that may prompt: `scp`/`ssh` (use `-o BatchMode=yes`), `apt-get` (use `-y`), `brew` (use `HOMEBREW_NO_AUTO_UPDATE=1`).

## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods. Run `bd onboard` to get started.

bd is dependency-aware (tracks blockers/relationships), version-controlled (built on Dolt with cell-level merge), and agent-optimized (JSON output, ready-work detection, `discovered-from` links).

### Quick Reference

```bash
bd ready --json                       # Find available work (unblocked issues)
bd show <id>                          # View issue details + dependencies
bd update <id> --claim --json         # Claim work atomically
bd update <id> --priority 1 --json    # Update a field
bd close <id> --reason "Done" --json  # Complete work
bd dolt push                          # Push beads data to remote
```

**Creating issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Found bug" --description="What was found" -p 1 --deps discovered-from:<parent-id> --json
```

- Issue types: `bug`, `feature`, `task` (tests/docs/refactoring), `epic`, `chore` (maintenance).
- Priorities: `0` critical, `1` high, `2` medium (default), `3` low, `4` backlog.
- Always use `--json` for programmatic use; link discovered work with `discovered-from`.
- Do NOT use `bd edit` — it opens `$EDITOR` and blocks agents.

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues.
2. **Claim atomically**: `bd update <id> --claim`.
3. **Work on it**: implement, test, document.
4. **Discover new work?** Create a linked issue with `--deps discovered-from:<parent-id>`.
5. **Complete**: `bd close <id> --reason "Done"`.

bd auto-syncs with git: exports to `.beads/issues.jsonl` after changes (5s debounce), imports from JSONL when newer (e.g. after `git pull`). No manual export/import needed.

## Landing the Plane (Session Completion)

When ending a work session, you MUST complete ALL steps below. **Work is NOT complete until `git push` succeeds.**

1. **File issues** for any remaining/follow-up work.
2. **Run quality gates** if code changed — tests, linters, builds.
3. **Update issue status** — close finished work, update in-progress items.
4. **Push to remote** (MANDATORY):
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status   # MUST show "up to date with origin"
   ```
5. **Clean up** — clear stashes, prune remote branches.
6. **Verify** all changes are committed AND pushed.
7. **Hand off** — provide context for the next session.

Never stop before pushing — that leaves work stranded locally. If push fails, resolve and retry until it succeeds.
