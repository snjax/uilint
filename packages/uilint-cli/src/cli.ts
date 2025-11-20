import type { LayoutCommandArgs } from './layoutCommand';
import { parseLayoutArgs, runLayoutCommand } from './layoutCommand';
import { runInitCommand } from './initCommand';
import { resolveConfig } from './config';
import type { LayoutConfig } from './types';

interface GlobalOptions {
  configPath?: string;
  help?: boolean;
}

interface ParsedCommand {
  command: string;
  args: string[];
  global: GlobalOptions;
}

function stripGlobalOptions(argv: string[]): ParsedCommand {
  const rest: string[] = [];
  const global: GlobalOptions = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) {
      continue;
    }
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

    if (token === '--config' || token.startsWith('--config=')) {
      const value = pullValue();
      if (value) {
        global.configPath = value;
      }
      continue;
    }

    if (token === '--help' || token === '-h') {
      global.help = true;
      continue;
    }

    rest.push(token);
  }

  let command: string | null = null;
  const args: string[] = [];
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (
      !command &&
      !token.startsWith('--') &&
      (i === 0 || rest[i - 1]?.startsWith('--'))
    ) {
      command = token;
      continue;
    }
    args.push(token);
  }

  return {
    command: command ?? 'layout',
    args,
    global,
  };
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`uilint CLI

Usage:
  uilint [command] [options]

Commands:
  layout [options]        Run layout checks (default)
  init                    Initialize uilint in the current project

Options (for layout):
  --scenario <name>       Run a single scenario (default: all)
  --viewport WIDTHxHEIGHT Run a single custom viewport
  --viewports list        Comma-separated presets/groups/custom entries
  --workers <n>           Parallel Playwright workers (default: cpu-based)
  --format json|compact   Output format for reports (default: json)
  --skip-build            Skip running the configured build step
  --config <path>         Path to uilint.config file
  --help                  Show this message

Viewport list accepts presets like "iphone", groups (mobile/tablet/desktop),
or custom entries such as modal=1280x720.`);
}

function ensureLayoutConfig(config: { layout?: LayoutConfig }): LayoutConfig {
  if (!config.layout) {
    throw new Error('uilint.config is missing a "layout" section.');
  }
  if (!config.layout.scenarios || !Object.keys(config.layout.scenarios).length) {
    throw new Error('uilint.config layout.scenarios is empty.');
  }
  return config.layout;
}

export async function runUilintCli(argv: string[]): Promise<number> {
  const parsed = stripGlobalOptions(argv);
  if (parsed.global.help) {
    printHelp();
    return 0;
  }

  switch (parsed.command) {
    case 'init':
      return runInitCommand();
    case 'layout': {
      const { config, configDir } = await resolveConfig({ configPath: parsed.global.configPath });
      const layoutConfig = ensureLayoutConfig(config);
      return runLayout(parsed.args, { configDir, layout: layoutConfig });
    }
    default:
      throw new Error(`Unknown command "${parsed.command}". Supported commands: layout, init.`);
  }
}

async function runLayout(args: string[], context: { configDir: string; layout: LayoutConfig }): Promise<number> {
  const layoutArgs: LayoutCommandArgs = parseLayoutArgs(args);
  const result = await runLayoutCommand({ configDir: context.configDir, layout: context.layout }, layoutArgs);
  return result.hasViolations ? 1 : 0;
}
