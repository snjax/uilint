import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

function transpileTs(source: string, fileName: string): string {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      allowImportingTsExtensions: true,
    },
    fileName,
  });
  return result.outputText;
}

let tsExtensionRegistered = false;

function ensureTsExtension(): void {
  if (tsExtensionRegistered) {
    return;
  }

  const extensions = (Module as unknown as {
    _extensions: Record<string, (mod: NodeModule & { _compile: (code: string, filename: string) => void }, filename: string) => void>;
  })._extensions;
  const handler = (mod: NodeModule & { _compile: (code: string, filename: string) => void }, filename: string) => {
    const source = fsSync.readFileSync(filename, 'utf-8');
    const output = transpileTs(source, path.basename(filename));
    mod._compile(output, filename);
  };

  extensions['.ts'] = handler;
  extensions['.mts'] = handler;
  extensions['.cts'] = handler;

  tsExtensionRegistered = true;
}

async function loadTsModule(filePath: string): Promise<unknown> {
  ensureTsExtension();
  const source = await fs.readFile(filePath, 'utf-8');
  const output = transpileTs(source, path.basename(filePath));

  const localRequire = createRequire(filePath);
  const moduleWrapper = new Function(
    'require',
    'module',
    'exports',
    '__dirname',
    '__filename',
    output,
  );

  const mod: { exports: unknown } = { exports: {} };
  moduleWrapper(localRequire, mod, mod.exports, path.dirname(filePath), filePath);
  return mod.exports;
}

type DynamicImport = (specifier: string) => Promise<unknown>;
const dynamicImport: DynamicImport = new Function('specifier', 'return import(specifier);') as DynamicImport;

async function loadJsModule(filePath: string): Promise<unknown> {
  const ext = path.extname(filePath).toLowerCase();
  const localRequire = createRequire(filePath);
  if (ext === '.cjs') {
    return localRequire(filePath);
  }
  return dynamicImport(pathToFileURL(filePath).href);
}

export async function loadModuleFromFile(filePath: string): Promise<unknown> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.ts' || ext === '.mts' || ext === '.cts') {
    return loadTsModule(filePath);
  }
  return loadJsModule(filePath);
}
