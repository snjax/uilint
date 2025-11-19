import fs from 'node:fs/promises';
import path from 'node:path';
import type { LoadedConfig, UilintConfig } from './types';
import { loadModuleFromFile } from './moduleLoader';

const CONFIG_CANDIDATES = [
  'uilint.config.ts',
  'uilint.config.mts',
  'uilint.config.cts',
  'uilint.config.js',
  'uilint.config.cjs',
  'uilint.config.mjs',
];

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findConfigPath(cwd: string): Promise<string | null> {
  for (const candidate of CONFIG_CANDIDATES) {
    const resolved = path.resolve(cwd, candidate);
    // eslint-disable-next-line no-await-in-loop
    if (await pathExists(resolved)) {
      return resolved;
    }
  }
  return null;
}

function unwrapModule<T>(mod: T): unknown {
  if (mod && typeof mod === 'object' && 'default' in (mod as Record<string, unknown>)) {
    const defaultValue = (mod as unknown as { default: unknown }).default;
    if (defaultValue && typeof defaultValue === 'object') {
      return defaultValue;
    }
  }
  return mod;
}

export interface ResolveConfigOptions {
  cwd?: string;
  configPath?: string;
}

export async function resolveConfig(options: ResolveConfigOptions = {}): Promise<LoadedConfig> {
  const cwd = options.cwd ?? process.cwd();
  const explicitPath = options.configPath ? path.resolve(cwd, options.configPath) : null;
  const actualPath = explicitPath ?? (await findConfigPath(cwd));

  if (!actualPath) {
    throw new Error('Unable to find uilint.config file. Pass --config to specify a path.');
  }

  const rawModule = await loadModuleFromFile(actualPath);
  const candidate = unwrapModule(rawModule);
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(`Config file ${actualPath} does not export an object.`);
  }

  const config = candidate as UilintConfig;
  return {
    config,
    configPath: actualPath,
    configDir: path.dirname(actualPath),
  };
}
