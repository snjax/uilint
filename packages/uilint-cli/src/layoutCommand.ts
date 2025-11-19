import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Browser, Page } from '@playwright/test';
import { chromium } from '@playwright/test';
import type { LayoutReport, LayoutSpec } from '@uilint/core';
import { runLayoutSpec } from '@uilint/playwright';
import { DEFAULT_VIEWPORT_GROUPS, DEFAULT_VIEWPORT_ORDER, DEFAULT_VIEWPORTS } from './constants';
import { loadModuleFromFile } from './moduleLoader';
import type {
  BuildStep,
  LayoutConfig,
  LayoutScenarioEntry,
  NamedViewport,
  ViewportSize,
} from './types';
import type { ScenarioModule, ScenarioRuntime, ScenarioSnapshotOptions } from './scenarioRuntime';

type PageGotoOptions = Parameters<Page['goto']>[1];

export interface LayoutCommandArgs {
  scenario: string;
  viewportOverride: NamedViewport | null;
  viewportTokens: string[] | null;
  skipBuild: boolean;
  format: 'json' | 'compact';
  workers: number | null;
}

export function parseLayoutArgs(argv: string[]): LayoutCommandArgs {
  const args: LayoutCommandArgs = {
    scenario: 'all',
    viewportOverride: null,
    viewportTokens: null,
    skipBuild: false,
    format: 'json',
    workers: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? '';
    const next = argv[i + 1];
    const pullValue = (): string | null => {
      if (token.includes('=')) {
        return token.split('=')[1];
      }
      if (next && !next.startsWith('--')) {
        i += 1;
        return next;
      }
      return null;
    };

    if (token.startsWith('--scenario')) {
      const value = pullValue();
      if (value) {
        args.scenario = value;
      }
    } else if (token.startsWith('--viewport=')) {
      const payload = token.split('=')[1];
      const custom = parseViewportOverride(payload);
      if (custom) {
        args.viewportOverride = custom;
      }
    } else if (token === '--viewport') {
      const value = pullValue();
      const custom = value ? parseViewportOverride(value) : null;
      if (custom) {
        args.viewportOverride = custom;
      }
    } else if (token.startsWith('--viewports')) {
      const value = pullValue();
      if (value) {
        args.viewportTokens = value
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);
      }
    } else if (token === '--skip-build') {
      args.skipBuild = true;
    } else if (token.startsWith('--format')) {
      const value = pullValue();
      if (value === 'json' || value === 'compact') {
        args.format = value;
      }
    } else if (token.startsWith('--workers') || token.startsWith('--parallel')) {
      const value = pullValue();
      if (value) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed) && parsed > 0) {
          args.workers = Math.floor(parsed);
        }
      }
    }
  }

  return args;
}

function parseViewportOverride(value: string | undefined | null): NamedViewport | null {
  if (!value) {
    return null;
  }
  const parsed = parseViewportSize(value);
  if (!parsed) {
    throw new Error(`Unable to parse --viewport value "${value}". Expected WIDTHxHEIGHT.`);
  }
  return { name: 'custom', size: parsed };
}

function parseViewportSize(payload: string): ViewportSize | null {
  const trimmed = payload.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)x(\d+)$/);
  if (!match) {
    return null;
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (Number.isNaN(width) || Number.isNaN(height)) {
    return null;
  }
  return { width, height };
}

interface ViewportResolutionContext {
  config: LayoutConfig;
  tokens: string[] | null;
  override: NamedViewport | null;
}

function mergeViewportMaps(config: LayoutConfig): Record<string, ViewportSize> {
  const merged: Record<string, ViewportSize> = { ...DEFAULT_VIEWPORTS };
  if (config.viewports) {
    for (const [name, size] of Object.entries(config.viewports)) {
      merged[name] = size;
    }
  }
  return merged;
}

function mergeViewportGroups(config: LayoutConfig): Record<string, string[]> {
  if (!config.viewportGroups) {
    return { ...DEFAULT_VIEWPORT_GROUPS };
  }
  const merged: Record<string, string[]> = { ...DEFAULT_VIEWPORT_GROUPS };
  for (const [group, members] of Object.entries(config.viewportGroups)) {
    merged[group.toLowerCase()] = members;
  }
  return merged;
}

function defaultViewportOrder(config: LayoutConfig, viewportMap: Record<string, ViewportSize>): string[] {
  const order = [...DEFAULT_VIEWPORT_ORDER];
  const customNames = Object.keys(config.viewports ?? {});
  for (const name of customNames) {
    if (!order.includes(name)) {
      order.push(name);
    }
  }
  return order.filter(name => viewportMap[name]);
}

function parseViewportToken(
  token: string,
  viewportMap: Record<string, ViewportSize>,
  groups: Record<string, string[]>,
): NamedViewport[] {
  const normalized = token.trim();
  if (!normalized) {
    return [];
  }
  const lower = normalized.toLowerCase();
  if (groups[lower]) {
    return groups[lower]
      .map(name => {
        const preset = viewportMap[name];
        if (!preset) {
          return null;
        }
        return { name, size: preset } satisfies NamedViewport;
      })
      .filter((item): item is NamedViewport => Boolean(item));
  }

  const customMatch = normalized.match(/^(?<name>[a-z0-9-]+)=(?<dims>\d+x\d+)$/i);
  if (customMatch?.groups?.name && customMatch.groups.dims) {
    const dims = parseViewportSize(customMatch.groups.dims);
    if (!dims) {
      throw new Error(`Unable to parse viewport token "${token}".`);
    }
    return [{ name: customMatch.groups.name, size: dims }];
  }

  const preset = viewportMap[normalized];
  if (!preset) {
    throw new Error(
      `Unknown viewport token "${token}". Use preset names, groups (mobile/tablet/desktop), or name=WIDTHxHEIGHT.`,
    );
  }
  return [{ name: normalized, size: preset }];
}

function dedupeViewports(items: NamedViewport[]): NamedViewport[] {
  const seen = new Set<string>();
  const result: NamedViewport[] = [];
  for (const item of items) {
    if (seen.has(item.name)) {
      continue;
    }
    seen.add(item.name);
    result.push(item);
  }
  return result;
}

function resolveViewportList(context: ViewportResolutionContext): NamedViewport[] {
  if (context.override) {
    return [context.override];
  }

  const viewportMap = mergeViewportMaps(context.config);
  const groups = mergeViewportGroups(context.config);
  const order = defaultViewportOrder(context.config, viewportMap);

  if (!context.tokens || context.tokens.length === 0) {
    return order
      .map(name => {
        const preset = viewportMap[name];
        return preset ? { name, size: preset } : null;
      })
      .filter((item): item is NamedViewport => Boolean(item));
  }

  const expanded = context.tokens.flatMap(token => parseViewportToken(token, viewportMap, groups));
  const deduped = dedupeViewports(expanded);
  if (!deduped.length) {
    throw new Error('Viewport selection resolved to an empty list.');
  }
  return deduped;
}

interface StaticServerHandle {
  port: number;
  close: () => Promise<void>;
}

const MAX_PORT_ATTEMPTS = 50;

async function bindServer(server: http.Server, host: string, port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onListening = (): void => {
      server.removeListener('error', onError);
      resolve();
    };
    const onError = (error: NodeJS.ErrnoException): void => {
      server.removeListener('listening', onListening);
      reject(error);
    };
    server.once('listening', onListening);
    server.once('error', onError);
    server.listen(port, host);
  });
}

async function startStaticServer(rootDir: string, host: string, preferredPort: number): Promise<StaticServerHandle> {
  const mimeMap: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
  };

  const resolveFile = async (requestPath: string): Promise<{ filePath: string; mime: string } | null> => {
    const clean = requestPath.split('?')[0]?.split('#')[0] ?? '/';
    const relative = clean === '/' ? 'index.html' : clean.replace(/^\//, '');
    const filePath = path.join(rootDir, relative);
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat) {
      return null;
    }
    if (stat.isDirectory()) {
      return resolveFile(path.join(relative, 'index.html'));
    }
    const ext = path.extname(filePath);
    return { filePath, mime: mimeMap[ext] ?? 'application/octet-stream' };
  };

  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    const port = preferredPort + attempt;
    const server = http.createServer(async (req, res) => {
      const asset = await resolveFile(req.url ?? '/');
      if (!asset) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const body = await fs.readFile(asset.filePath);
      res.writeHead(200, { 'content-type': asset.mime });
      res.end(body);
    });

    try {
      await bindServer(server, host, port);
      return {
        port,
        close: () =>
          new Promise<void>((resolve, reject) => {
            server.close(err => {
              if (err) {
                reject(err);
                return;
              }
              resolve();
            });
          }),
      };
    } catch (error) {
      server.removeAllListeners();
      try {
        server.close();
      } catch {
        // ignore close errors during retry
      }
      if ((error as NodeJS.ErrnoException)?.code === 'EADDRINUSE') {
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Unable to bind an available port near ${preferredPort}.`);
}

async function runBuildStep(build: BuildStep | undefined, skip: boolean, cwd: string): Promise<void> {
  if (!build || skip) {
    return;
  }
  if (typeof build === 'string') {
    const result = spawnSync(build, {
      stdio: 'inherit',
      env: process.env,
      shell: true,
      cwd,
    });
    if (result.status !== 0) {
      throw new Error(`Build command "${build}" failed with exit code ${result.status ?? 1}.`);
    }
    return;
  }
  const previousCwd = process.cwd();
  try {
    process.chdir(cwd);
    await build();
  } finally {
    process.chdir(previousCwd);
  }
}

interface ScenarioPlanEntry {
  scenarioKey: string;
  scenario: LayoutScenarioEntry;
  viewport: NamedViewport;
  run: () => Promise<{ reports: LayoutReport[] }>;
}

async function runPlanWithConcurrency(plan: ScenarioPlanEntry[], workers: number): Promise<Array<{ reports: LayoutReport[] }>> {
  if (!plan.length) {
    return [];
  }
  const results: Array<{ reports: LayoutReport[] }> = new Array(plan.length);
  let cursor = 0;
  let aborted = false;
  let firstError: unknown = null;

  async function worker(): Promise<void> {
    while (!aborted) {
      const next = cursor;
      if (next >= plan.length) {
        break;
      }
      cursor += 1;
      const entry = plan[next];
      try {
        const result = await entry.run();
        results[next] = result;
      } catch (error) {
        if (!firstError) {
          firstError = error;
          aborted = true;
        }
      }
    }
  }

  const workerCount = Math.max(1, Math.min(workers, plan.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (firstError) {
    throw firstError;
  }

  return results;
}

async function importScenario(modulePath: string, exportName?: string): Promise<ScenarioModule> {
  const mod = await loadModuleFromFile(modulePath);
  if (!mod) {
    throw new Error(`Unable to import scenario from ${modulePath}`);
  }
  const targetName = exportName ?? 'default';
  let candidate: unknown;
  if (targetName === 'default') {
    if (typeof mod === 'function') {
      candidate = mod;
    } else if (typeof (mod as Record<string, unknown>).default === 'function') {
      candidate = (mod as Record<string, unknown>).default;
    }
  } else {
    candidate = (mod as Record<string, unknown>)[targetName];
  }

  if (typeof candidate !== 'function') {
    throw new Error(`Scenario export "${targetName}" in ${modulePath} is not a function.`);
  }

  return candidate as ScenarioModule;
}

function createScenarioRuntime(params: {
  page: Page;
  viewport: NamedViewport;
  baseUrl: string;
  scenarioKey: string;
  reports: LayoutReport[];
}): ScenarioRuntime {
  const { page, viewport, baseUrl, scenarioKey, reports } = params;

  const goto = async (targetPath: string, options?: PageGotoOptions): Promise<void> => {
    if (/^https?:\/\//i.test(targetPath)) {
      await page.goto(targetPath, { waitUntil: 'networkidle', ...options });
      return;
    }
    const normalized = targetPath.replace(/^\/+/, '');
    const url = `${baseUrl}/${normalized}`;
    await page.goto(url, { waitUntil: 'networkidle', ...options });
  };

  const snapshot = async (name: string, spec: LayoutSpec, options?: ScenarioSnapshotOptions): Promise<LayoutReport> => {
    const report = await runLayoutSpec(page, spec, {
      viewTag: options?.viewTag ?? `${scenarioKey}-${viewport.name}-${name}`,
    });
    reports.push(report);
    return report;
  };

  return {
    page,
    viewport,
    baseUrl,
    goto,
    snapshot,
  };
}

async function runScenarioPlanEntry(args: {
  scenarioKey: string;
  scenario: LayoutScenarioEntry;
  viewport: NamedViewport;
  host: string;
  port: number;
  configDir: string;
}): Promise<{ reports: LayoutReport[] }> {
  const { scenarioKey, scenario, viewport, host, port, configDir } = args;
  const modulePath = path.resolve(configDir, scenario.module);
  const scenarioFn = await importScenario(modulePath, scenario.exportName);

  const browser: Browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage({ viewport: viewport.size });
  const baseUrl = `http://${host}:${port}`;
  const reports: LayoutReport[] = [];
  const runtime = createScenarioRuntime({ page, viewport, baseUrl, scenarioKey, reports });

  try {
    await scenarioFn(runtime);
    return { reports };
  } finally {
    await page.close();
    await browser.close();
  }
}

function resolveScenarioKeys(layout: LayoutConfig, requested: string): string[] {
  const scenarios = layout.scenarios ?? {};
  if (requested === 'all') {
    return Object.keys(scenarios);
  }
  if (!scenarios[requested]) {
    throw new Error(`Unknown scenario "${requested}". Available: ${Object.keys(scenarios).join(', ')} or "all".`);
  }
  return [requested];
}

function resolveScenarioViewports(
  layout: LayoutConfig,
  scenario: LayoutScenarioEntry,
  cliArgs: LayoutCommandArgs,
): NamedViewport[] {
  const tokens = cliArgs.viewportTokens ?? scenario.viewports ?? null;
  return resolveViewportList({ config: layout, tokens, override: cliArgs.viewportOverride });
}

export interface LayoutCommandContext {
  configDir: string;
  layout: LayoutConfig;
}

export interface LayoutCommandResult {
  hasViolations: boolean;
}

export async function runLayoutCommand(
  context: LayoutCommandContext,
  cliArgs: LayoutCommandArgs,
): Promise<LayoutCommandResult> {
  const scenarios = context.layout.scenarios ?? {};
  if (!Object.keys(scenarios).length) {
    throw new Error('uilint.config layout.scenarios is empty.');
  }

  const scenarioKeys = resolveScenarioKeys(context.layout, cliArgs.scenario);
  const host = context.layout.server?.host ?? '127.0.0.1';
  const preferredPort = context.layout.server?.port ?? 4317;
  const distDir = path.resolve(context.configDir, context.layout.distDir);

  await runBuildStep(context.layout.build, cliArgs.skipBuild, context.configDir);

  const serverHandle = await startStaticServer(distDir, host, preferredPort);
  const actualPort = serverHandle.port;
  let hasViolations = false;

  try {
    const plan: ScenarioPlanEntry[] = [];
    for (const scenarioKey of scenarioKeys) {
      const scenarioEntry = scenarios[scenarioKey];
      if (!scenarioEntry) {
        continue;
      }
      const viewports = resolveScenarioViewports(context.layout, scenarioEntry, cliArgs);
      for (const viewport of viewports) {
        plan.push({
          scenarioKey,
          scenario: scenarioEntry,
          viewport,
          run: () =>
            runScenarioPlanEntry({
              scenarioKey,
              scenario: scenarioEntry,
              viewport,
              host,
              port: actualPort,
              configDir: context.configDir,
            }),
        });
      }
    }

    const cpuCount = typeof os.cpus === 'function' ? os.cpus().length : 1;
    const defaultWorkers = Math.min(4, Math.max(1, cpuCount));
    const requestedWorkers = cliArgs.workers ?? defaultWorkers;

    const results = await runPlanWithConcurrency(plan, Math.max(1, requestedWorkers));
    for (const result of results) {
      if (!result) {
        continue;
      }
      for (const report of result.reports) {
        const payload = cliArgs.format === 'compact' ? JSON.stringify(report) : JSON.stringify(report, null, 2);
        process.stdout.write(`${payload}\n`);
        if (report?.violations?.length) {
          hasViolations = true;
        }
      }
    }
  } finally {
    await serverHandle.close();
  }

  return { hasViolations };
}
