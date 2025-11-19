import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import dotenv from 'dotenv';

const DEFAULT_CLIENT_INFO = {
  name: 'uilint-mcp-cli',
  version: '1.0.0',
};

export async function runMcpCli(config) {
  const {
    serverName,
    serverUrl,
    requiredEnv = [],
    headerBuilder,
    dotenvPath,
    clientInfo = DEFAULT_CLIENT_INFO,
    usageExamples = [],
    description,
    defaultCommand,
  } = config;

  const dotenvOptions = { quiet: true };
  if (dotenvPath) {
    dotenvOptions.path = dotenvPath;
  }
  dotenv.config(dotenvOptions);

  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) {
    const message = `Missing required environment variables for ${serverName}: ${missing.join(
      ', ',
    )}. Ensure they are defined in tools/.env.`;
    emitAndExit({ error: message }, false, 1);
    return;
  }

  const headers =
    typeof headerBuilder === 'function' ? headerBuilder(process.env) ?? {} : {};

  const cursorEnvelope = await readCursorEnvelope();
  const cursorMode = Boolean(cursorEnvelope);

  let command = cursorEnvelope
    ? parseCursorEnvelope(cursorEnvelope)
    : parseCliArgs(process.argv.slice(2));

  if (!command && defaultCommand) {
    command = { action: defaultCommand };
  }

  if (!command) {
    const usage = buildUsage(serverName, usageExamples, description);
    emitAndExit({ output: usage }, cursorMode, cursorMode ? 0 : 1);
    return;
  }

  try {
    const result = await executeCommand(
      {
        serverUrl,
        serverName,
        headers,
        clientInfo,
      },
      command,
    );
    emitAndExit(result, cursorMode, 0);
  } catch (error) {
    emitAndExit(formatError(error), cursorMode, 1);
  }
}

async function executeCommand(config, descriptor) {
  const session = await connect(config);
  const { client, transport, protocol } = session;
  try {
    switch (descriptor.action) {
      case 'list-tools': {
        const tools = await client.listTools();
        return {
          title: `${config.serverName}: ${tools.tools.length} tool(s)`,
          output: formatList(
            tools.tools,
            (tool) => `- ${tool.name}: ${tool.description ?? 'no description'}`,
          ),
          data: {
            protocol,
            ...tools,
          },
        };
      }
      case 'list-prompts': {
        const prompts = await client.listPrompts();
        return {
          title: `${config.serverName}: ${prompts.prompts.length} prompt(s)`,
          output: formatList(
            prompts.prompts,
            (prompt) => `- ${prompt.name}: ${prompt.description ?? ''}`,
          ),
          data: {
            protocol,
            ...prompts,
          },
        };
      }
      case 'list-resources': {
        const resources = await client.listResources();
        return {
          title: `${config.serverName}: ${resources.resources.length} resource(s)`,
          output: formatList(
            resources.resources,
            (res) => `- ${res.name ?? res.uri}: ${res.description ?? ''}`,
          ),
          data: {
            protocol,
            ...resources,
          },
        };
      }
      case 'get-prompt': {
        const name = ensure(descriptor.name, 'Prompt name is required.');
        const args = descriptor.args ?? {};
        const prompt = await client.getPrompt({
          name,
          arguments: args,
        });
        return {
          title: `${config.serverName}: prompt "${name}"`,
          output: formatPrompt(prompt),
          data: {
            protocol,
            prompt,
          },
        };
      }
      case 'read-resource': {
        const uri = ensure(descriptor.uri, 'Resource URI is required.');
        const resource = await client.readResource({
          uri,
        });
        return {
          title: `${config.serverName}: resource "${uri}"`,
          output: formatResource(resource),
          data: {
            protocol,
            resource,
          },
        };
      }
      case 'call-tool': {
        const name = ensure(descriptor.name, 'Tool name is required.');
        const args = descriptor.args ?? {};
        const result = await client.callTool({
          name,
          arguments: args,
        });
        return {
          title: `${config.serverName}: tool "${name}"`,
          output: formatToolCall(result),
          data: {
            protocol,
            result,
          },
        };
      }
      default:
        throw new Error(`Unsupported action: ${descriptor.action}`);
    }
  } finally {
    await Promise.allSettled([client.close(), transport?.close?.()]);
  }
}

async function connect(config) {
  const { serverUrl, headers, clientInfo } = config;
  const url = new URL(serverUrl);

  try {
    const client = new Client(clientInfo);
    const transport = new StreamableHTTPClientTransport(url, {
      requestInit: { headers },
    });
    await client.connect(transport);
    return { client, transport, protocol: 'streamable-http' };
  } catch (error) {
    if (
      error instanceof StreamableHTTPError &&
      error.code !== undefined &&
      error.code >= 400 &&
      error.code < 500
    ) {
      // fall through to SSE below
    } else {
      throw error;
    }
  }

  const client = new Client(clientInfo);
  const transport = new SSEClientTransport(url, {
    eventSourceInit: { headers },
    requestInit: { headers },
  });
  await client.connect(transport);
  return { client, transport, protocol: 'sse' };
}

function parseCliArgs(args) {
  if (!args.length) {
    return null;
  }

  const [action, ...rest] = args;
  switch (action) {
    case 'list-tools':
    case 'list-prompts':
    case 'list-resources':
      return { action };
    case 'get-prompt':
      return {
        action,
        name: ensure(rest[0], 'Prompt name is required.'),
        args: parseJson(rest[1]),
      };
    case 'read-resource':
      return {
        action,
        uri: ensure(rest[0], 'Resource URI is required.'),
      };
    case 'call-tool':
      return {
        action,
        name: ensure(rest[0], 'Tool name is required.'),
        args: parseJson(rest[1]),
      };
    default:
      throw new Error(`Unknown command "${action}".`);
  }
}

function parseCursorEnvelope(envelope) {
  if (!envelope) return null;
  if (envelope.command) {
    return normalizeCommand(envelope);
  }
  const maybeInput =
    typeof envelope.input === 'undefined' ? envelope : envelope.input;
  if (typeof maybeInput === 'string') {
    return parseNaturalLanguageInput(maybeInput);
  }
  if (
    typeof maybeInput === 'object' &&
    maybeInput !== null &&
    maybeInput.command
  ) {
    return normalizeCommand(maybeInput);
  }
  return null;
}

function normalizeCommand(command) {
  const normalized = command.command ?? command.action;
  if (!normalized) return null;
  return {
    action: normalized,
    name: command.name,
    uri: command.uri,
    args: command.args,
  };
}

function parseNaturalLanguageInput(input) {
  if (!input) return null;
  const text = input.trim();
  const lower = text.toLowerCase();

  if (lower.includes('list tools')) return { action: 'list-tools' };
  if (lower.includes('list prompts')) return { action: 'list-prompts' };
  if (lower.includes('list resources')) return { action: 'list-resources' };

  const callMatch = text.match(/call tool\s+([^\s]+)/i);
  if (callMatch) {
    return {
      action: 'call-tool',
      name: callMatch[1],
      args: extractJson(text),
    };
  }

  const promptMatch = text.match(/get prompt\s+([^\s]+)/i);
  if (promptMatch) {
    return {
      action: 'get-prompt',
      name: promptMatch[1],
      args: extractJson(text),
    };
  }

  const resourceMatch = text.match(/read resource\s+([^\s]+)/i);
  if (resourceMatch) {
    return {
      action: 'read-resource',
      uri: resourceMatch[1],
    };
  }

  return null;
}

async function readCursorEnvelope() {
  if (process.stdin.isTTY) {
    return null;
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { input: raw };
  }
}

function parseJson(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }
}

function extractJson(text) {
  const start = text.indexOf('{');
  if (start === -1) return undefined;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const jsonText = text.slice(start, i + 1);
        try {
          return JSON.parse(jsonText);
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

function formatList(items, mapper) {
  if (!items?.length) return 'No entries.';
  return items.map(mapper).join('\n');
}

function formatPrompt(prompt) {
  const messages = prompt.messages ?? [];
  if (!messages.length) return 'Prompt has no messages.';
  return messages
    .map((message, index) => {
      const role = message.role ?? 'assistant';
      const content = renderContent(message.content);
      return `${index + 1}. ${role}: ${content}`;
    })
    .join('\n');
}

function formatResource(resource) {
  const contents = resource.contents ?? [];
  if (!contents.length) return 'Resource has no contents.';
  return contents
    .map((entry) => renderContent([entry]))
    .join('\n---\n')
    .trim();
}

function formatToolCall(result) {
  if (result?.content?.length) {
    return renderContent(result.content);
  }
  if (result?.structuredContent) {
    return JSON.stringify(result.structuredContent, null, 2);
  }
  return 'Tool executed with no textual result.';
}

function renderContent(content) {
  if (!Array.isArray(content) || !content.length) return '(no content)';
  return content
    .map((item) => {
      switch (item.type) {
        case 'text':
          return item.text ?? '';
        case 'image':
          return `[image ${item.mediaType ?? 'unknown'} (${item.data?.length ?? 0} bytes)]`;
        case 'resource':
          return `[resource ${item.resource?.uri ?? 'unknown'}]`;
        case 'input_text':
          return item.text ?? '';
        default:
          return `[${item.type}]`;
      }
    })
    .join('\n---\n');
}

function buildUsage(serverName, examples, description) {
  const lines = [`${serverName} CLI`, description ? description : null, '', 'Usage examples:'];
  if (examples.length) {
    examples.forEach((example) => lines.push(`  ${example}`));
  } else {
    lines.push('  list-tools');
    lines.push('  call-tool <toolName> {"arg":"value"}');
  }
  lines.push('', 'When called from Cursor tools, describe your intent in natural language, e.g.:');
  lines.push('  "list tools"', '  "call tool search_docs with {\\"query\\":\\"uilint\\"}"');
  return lines.filter(Boolean).join('\n');
}

function ensure(value, message) {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function formatError(error) {
  return {
    error: error.message ?? String(error),
    stack: error.stack,
  };
}

function emitAndExit(payload, cursorMode, code) {
  if (cursorMode) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  } else if (payload.error) {
    console.error(payload.error);
  } else if (payload.output) {
    if (payload.title) {
      console.log(payload.title);
    }
    console.log(payload.output);
    if (payload.data) {
      console.log(JSON.stringify(payload.data, null, 2));
    }
  } else {
    console.log(JSON.stringify(payload, null, 2));
  }
  if (code !== undefined) {
    process.exitCode = code;
  }
}

