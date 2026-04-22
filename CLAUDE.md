# CLAUDE.md — mcp-forge

> Build MCP servers from scratch. The right way, the first time.

## What This Is

mcp-forge teaches agents how to build Model Context Protocol servers — from API design through tool schemas, typed I/O, testing, and distribution via the Eidos marketplace.

## Why

Building an MCP server involves decisions that compound: tool naming, schema design, error handling, auth patterns, capability declarations. Getting these wrong early means refactoring every consumer. mcp-forge encodes the patterns that work.

## When to Use MCP (vs CLI)

Use MCP when:
- The consumer doesn't have shell access (claude.ai, remote agents)
- You need typed parameters and structured outputs
- The tool is stateful (maintains connections, sessions, caches)
- You're building a channel plugin (Slack, Telegram — MCP is required)

Use CLI when:
- The consumer has shell access (Claude Code, Cursor, CI)
- Token budget matters (50 tools = 9K tokens)
- The tool wraps an existing REST API
- You need pipe-ability (`| jq`, `| grep`, `| xargs`)

## Skills

| Skill | What It Does |
|-------|-------------|
| `/mcp-forge init` | Scaffold a new MCP server — TypeScript or Python, with tool stubs |
| `/mcp-forge tool` | Add a tool to an existing server — schema, handler, test |
| `/mcp-forge channel` | Add channel capability (claude/channel) for messaging bridges |
| `/mcp-forge test` | Generate test harness for MCP tools |
| `/mcp-forge publish` | Package for Eidos marketplace distribution |

## Templates

| Template | What It Is |
|----------|-----------|
| `server-ts.ts` | TypeScript MCP server scaffold (SDK + stdio transport) |
| `server-py.py` | Python MCP server scaffold (mcp package + stdio) |
| `tool-template.ts` | Single tool definition with schema + handler |
| `channel-template.ts` | Channel capability declaration + notification handler |
| `marketplace-entry.json` | Eidos marketplace plugin.json + .mcp.json |

## Patterns Encoded

- **Tool naming**: verb_noun (e.g., `query_gold`, `run_sql`, `verify_page`)
- **Error handling**: structured errors with codes, not thrown exceptions
- **Auth**: env vars, never hardcoded, documented in README
- **Capabilities**: declare `tools`, `experimental/claude/channel`, `experimental/claude/channel/permission` as needed
- **Testing**: tool-level unit tests + integration smoke tests
- **Distribution**: Eidos marketplace packaging (plugin.json, .mcp.json with ${CLAUDE_PLUGIN_ROOT})

## Key Learnings (from slack-cc build)

- Marketplace plugins need `npm install` in the start script (deps aren't auto-installed)
- `--dangerously-load-development-channels` is required for private marketplace channel plugins
- Tool prefix for marketplace plugins: `mcp__plugin_<name>_<server>__<tool>`
- Five names must match: plugin.json name, channels.server, .mcp.json key, Server() name, skill prefix

## Related Forges

- **cli-forge** — the inverse: convert MCPs to agent-first CLIs
- **ship-forge** — CI/CD and distribution
- **foss-forge** — open-source packaging
