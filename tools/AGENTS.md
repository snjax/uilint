## MCP CLI Tools for Agents

Two CLI helpers live directly under `tools/`. They let you talk to MCP servers from Cursor (via the `@tools` integration) or from any terminal. Each script outputs structured text plus JSON, so you can script them easily.

### Available tools

| Script | Server | Purpose | Env vars |
| --- | --- | --- | --- |
| `tools/context7-mcp.mjs` | `https://mcp.context7.com/mcp` | Search Context7 docs/libraries via MCP tools, prompts, and resources | `CONTEXT7_API_KEY` |
| `tools/github-mcp.mjs` | `https://api.githubcopilot.com/mcp/` | Access GitHub Copilot’s MCP endpoints (repos, issues, discussions, etc.) | `GITHUB_API_KEY` |

API keys must be stored in `tools/.env` (see `tools/.env.example`). The scripts load that file automatically via `dotenv`.

### Running from the terminal

```bash
# list available tools on a server
node tools/context7-mcp.mjs list-tools

# call a tool with JSON arguments
node tools/github-mcp.mjs call-tool github.searchRepos '{"query":"uilint"}'

# read a resource / fetch a prompt
node tools/context7-mcp.mjs read-resource app://overview
node tools/context7-mcp.mjs get-prompt review-doc '{"topic":"uilint"}'
```

Commands:

- `list-tools`, `list-prompts`, `list-resources`
- `get-prompt <name> [jsonArgs]`
- `read-resource <uri>`
- `call-tool <name> [jsonArgs]`

`jsonArgs` must be valid JSON (wrap in single quotes inside the shell). Outputs always include a human-readable section followed by the raw JSON payload for downstream scripting.

### Using via Cursor `@tools`

When these scripts are registered as Cursor tools, Cursor sends the user prompt as the tool input. Use short natural-language instructions:

- `list tools`
- `get prompt docs_overview`
- `call tool search_docs with {"query": "uilint tables"}`

The helper tries to parse JSON snippets within the text, so keep the JSON well-formed. If you need optional arguments, append `with {...}` to the instruction.

### Tips & troubleshooting

- **Missing keys** – the CLI exits early if required env vars are absent. Keep `tools/.env` in sync with `.env.example`.
- **Transport fallback** – the runner attempts Streamable HTTP first and falls back to SSE automatically if the server only supports the legacy transport.
- **Structured data** – the final JSON block printed to stdout contains protocol metadata (`streamable-http` or `sse`), plus the raw MCP response. Parse it rather than the human text if you need automation.
- **Default action** – if you run a script without arguments (or trigger it from Cursor with a vague instruction), it defaults to `list-tools` so you can discover capabilities quickly.

