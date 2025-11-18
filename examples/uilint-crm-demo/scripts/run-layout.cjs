#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');
const { chromium } = require('@playwright/test');
const { runLayoutSpec } = require('@uilint/playwright');

const SPEC_REGISTRY = {
  login: { module: '../uilint/specs/loginLayoutSpec.ts', exportName: 'loginLayoutSpec', page: 'index.html', viewTag: 'cli-login' },
  dashboard: {
    module: '../uilint/specs/dashboardLayoutSpec.ts',
    exportName: 'dashboardLayoutSpec',
    page: 'dashboard.html',
    viewTag: 'cli-dashboard',
    setup: async page => {
      const button = page.getByRole('button', { name: /open insights/i });
      if ((await button.count()) > 0) {
        try {
          await button.first().click();
          await page.waitForTimeout(100);
        } catch (error) {
          console.warn('[layout:check] unable to open dashboard modal:', error?.message ?? error);
        }
      }
    },
  },
  crm: { module: '../uilint/specs/crmLayoutSpec.ts', exportName: 'crmLayoutSpec', page: 'crm.html', viewTag: 'cli-crm' },
};

const VIEWPORT_PRESETS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  'macbook-air': { width: 1280, height: 832 },
  'macbook-pro': { width: 1440, height: 900 },
  wide: { width: 1600, height: 900 },
  'ultra-wide': { width: 1920, height: 1080 },
  'screen-4k': { width: 2560, height: 1440 },
};

const DEFAULT_VIEWPORT_SEQUENCE = ['mobile', 'tablet', 'macbook-air', 'macbook-pro', 'wide', 'ultra-wide', 'screen-4k'];

function parseArgs(argv) {
  const args = {
    spec: 'all',
    page: null,
    viewportOverride: null,
    skipBuild: false,
    format: 'json',
    viewports: null,
    workers: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? '';
    const next = argv[i + 1];
    const pullValue = () => {
      if (arg.includes('=')) {
        return arg.split('=')[1];
      }
      if (next && !next.startsWith('--')) {
        i += 1;
        return next;
      }
      return null;
    };

    if (arg.startsWith('--spec')) {
      args.spec = pullValue() ?? args.spec;
    } else if (arg.startsWith('--page')) {
      args.page = pullValue() ?? args.page;
    } else if (arg.startsWith('--viewport')) {
      const payload = pullValue();
      if (payload) {
        const [w, h] = payload.split('x').map(Number);
        if (!Number.isNaN(w) && !Number.isNaN(h)) {
          args.viewportOverride = { width: w, height: h };
        }
      }
    } else if (arg.startsWith('--viewports')) {
      const payload = pullValue();
      args.viewports = payload ? payload.split(',').map(item => item.trim()).filter(Boolean) : [];
    } else if (arg === '--skip-build') {
      args.skipBuild = true;
    } else if (arg.startsWith('--format')) {
      args.format = pullValue() ?? 'json';
    } else if (arg.startsWith('--workers') || arg.startsWith('--parallel')) {
      const payload = pullValue();
      if (payload) {
        const parsed = Number(payload);
        if (!Number.isNaN(parsed) && parsed > 0) {
          args.workers = Math.floor(parsed);
        }
      }
    }
  }

  return args;
}

function ensureBuild(skipBuild) {
  if (skipBuild) return;
  const result = spawnSync('pnpm', ['build'], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error('Failed to build project before running layout checks.');
  }
}

async function startStaticServer(rootDir, host, port) {
  const mimeMap = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
  };

  const resolveFile = async requestPath => {
    const cleanPath = requestPath.split('?')[0].split('#')[0];
    const relative = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\//, '');
    const filePath = path.join(rootDir, relative);
    const stat = await fs.stat(filePath).catch(() => null);

    if (!stat) {
      return null;
    }

    if (stat.isDirectory()) {
      return resolveFile(path.join(relative, 'index.html'));
    }

    const ext = path.extname(filePath);
    return {
      filePath,
      mime: mimeMap[ext] ?? 'application/octet-stream',
    };
  };

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

  await new Promise(resolve => server.listen(port, host, resolve));

  return {
    server,
    close: () =>
      new Promise(resolve => {
        server.close(resolve);
      }),
  };
}

async function loadTsModule(modulePath) {
  const source = await fs.readFile(modulePath, 'utf-8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: path.basename(modulePath),
  });

  const moduleWrapper = new Function(
    'require',
    'module',
    'exports',
    '__dirname',
    '__filename',
    transpiled.outputText,
  );

  const mod = { exports: {} };
  moduleWrapper(require, mod, mod.exports, path.dirname(modulePath), modulePath);
  return mod.exports;
}

async function importSpec(modulePath, exportName) {
  const mod = await loadTsModule(modulePath);
  const spec = mod[exportName];
  if (!spec) {
    throw new Error(`Unable to find export "${exportName}" in ${modulePath}`);
  }
  return spec;
}

async function runSpec(specKey, viewportConfig, args, host, port) {
  const registryEntry = SPEC_REGISTRY[specKey];
  if (!registryEntry) {
    throw new Error(`Unknown spec "${specKey}". Available: ${Object.keys(SPEC_REGISTRY).join(', ')}`);
  }
  const targetPage = args.page ?? registryEntry.page;
  const targetFile = targetPage.endsWith('.html') ? targetPage : `${targetPage}.html`;

  const spec = await importSpec(path.resolve(__dirname, registryEntry.module), registryEntry.exportName);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: viewportConfig.size });
  await page.goto(`http://${host}:${port}/${targetFile}`, { waitUntil: 'networkidle' });
  if (typeof registryEntry.setup === 'function') {
    await registryEntry.setup(page, viewportConfig);
  }

  const report = await runLayoutSpec(page, spec, {
    viewTag: `${registryEntry.viewTag}-${viewportConfig.name}`,
  });

  await browser.close();
  return report;
}

async function runPlanWithConcurrency(plan, workerCount) {
  if (plan.length === 0) {
    return [];
  }

  const results = new Array(plan.length);
  let cursor = 0;
  let aborted = false;
  let firstError = null;

  async function worker() {
    while (true) {
      if (aborted) {
        break;
      }
      const current = cursor;
      if (current >= plan.length) {
        break;
      }
      cursor += 1;
      const entry = plan[current];
      try {
        const report = await entry.run();
        results[current] = {
          specKey: entry.specKey,
          viewportConfig: entry.viewportConfig,
          report,
        };
      } catch (error) {
        if (!firstError) {
          firstError = error;
          aborted = true;
        }
      }
    }
  }

  const actualWorkers = Math.max(1, Math.min(workerCount, plan.length));
  await Promise.all(Array.from({ length: actualWorkers }, () => worker()));

  if (firstError) {
    throw firstError;
  }

  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const distDir = path.resolve(__dirname, '..', 'dist');
  const host = '127.0.0.1';
  const port = 4317;

  const targetSpecs =
    args.spec === 'all'
      ? Object.keys(SPEC_REGISTRY)
      : SPEC_REGISTRY[args.spec]
        ? [args.spec]
        : (() => {
            throw new Error(`Unknown spec "${args.spec}". Available: ${Object.keys(SPEC_REGISTRY).join(', ')} or "all"`);
          })();

  const viewportNames =
    args.viewports && args.viewports.length ? args.viewports : DEFAULT_VIEWPORT_SEQUENCE;

  const viewportConfigs = args.viewportOverride
    ? [{ name: 'custom', size: args.viewportOverride }]
    : viewportNames.map(name => {
        const preset = VIEWPORT_PRESETS[name];
        if (!preset) {
          throw new Error(
            `Unknown viewport preset "${name}". Available: ${Object.keys(VIEWPORT_PRESETS).join(', ')} or use --viewport=WIDTHxHEIGHT`,
          );
        }
        return { name, size: preset };
      });

  ensureBuild(args.skipBuild);

  let server;
  let hasViolations = false;
  try {
    server = await startStaticServer(distDir, host, port);
    const plan = [];
    for (const specKey of targetSpecs) {
      for (const viewportConfig of viewportConfigs) {
        plan.push({
          specKey,
          viewportConfig,
          run: () => runSpec(specKey, viewportConfig, args, host, port),
        });
      }
    }

    const cpuCount = typeof os.cpus === 'function' ? os.cpus().length : 1;
    const defaultWorkers = Math.min(4, Math.max(1, cpuCount));
    const requestedWorkers = args.workers ?? defaultWorkers;
    const workerCount = Math.max(1, Math.min(requestedWorkers, plan.length));

    const results = await runPlanWithConcurrency(plan, workerCount);
    for (const { report } of results) {
      const payload = args.format === 'compact' ? JSON.stringify(report) : JSON.stringify(report, null, 2);
      process.stdout.write(`${payload}\n`);
      if (report.violations.length) {
        hasViolations = true;
      }
    }
  } finally {
    if (server) {
      await server.close();
    }
  }

  if (hasViolations) {
    process.exit(1);
  }
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

