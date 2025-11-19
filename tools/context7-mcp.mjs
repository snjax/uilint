#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMcpCli } from './runMcpCli.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dotenvPath = path.resolve(__dirname, '.env');

await runMcpCli({
  serverName: 'Context7 MCP',
  serverUrl: 'https://mcp.context7.com/mcp',
  requiredEnv: ['CONTEXT7_API_KEY'],
  headerBuilder: (env) => ({
    CONTEXT7_API_KEY: env.CONTEXT7_API_KEY,
  }),
  dotenvPath,
  usageExamples: [
    'node tools/context7-mcp.mjs list-tools',
    'node tools/context7-mcp.mjs call-tool docs.search {"query":"uilint"}',
  ],
  description:
    'Interact with the Context7 MCP server to search documentation and fetch reference material.',
  defaultCommand: 'list-tools',
});

