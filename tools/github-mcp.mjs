#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMcpCli } from './runMcpCli.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dotenvPath = path.resolve(__dirname, '.env');

await runMcpCli({
  serverName: 'GitHub MCP',
  serverUrl: 'https://api.githubcopilot.com/mcp/',
  requiredEnv: ['GITHUB_API_KEY'],
  headerBuilder: (env) => ({
    Authorization: `Bearer ${env.GITHUB_API_KEY}`,
  }),
  dotenvPath,
  usageExamples: [
    'node tools/github-mcp.mjs list-tools',
    'node tools/github-mcp.mjs call-tool repos.search {"query":"uilint"}',
  ],
  description:
    'Call the GitHub MCP server exposed by Copilot to inspect repositories, issues, discussions, and workflow data.',
  defaultCommand: 'list-tools',
});

