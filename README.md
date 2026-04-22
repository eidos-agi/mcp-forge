# mcp-forge

Build MCP servers the right way. From API design through marketplace distribution.

## When to Build an MCP (vs CLI)

Build MCP when:
- Consumer doesn't have shell access (claude.ai, remote agents)
- You need typed parameters and structured outputs
- The tool is stateful (connections, sessions, caches)
- You're building a channel plugin (Slack, Telegram)

Build CLI instead when:
- Consumer has shell access (Claude Code, Cursor, CI)
- Token budget matters (50 tools = 9K tokens)
- The tool wraps an existing REST API
- You need pipe-ability

## Skills

```bash
/mcp-forge init       # Scaffold new MCP server (TS or Python)
/mcp-forge tool       # Add a tool with schema + handler + test
/mcp-forge channel    # Add channel capability for messaging bridges
/mcp-forge test       # Generate test harness
/mcp-forge publish    # Package for Eidos marketplace
```

## Patterns Encoded

- Tool naming: `verb_noun` (query_gold, verify_page)
- Structured errors with codes
- Auth via env vars, never hardcoded
- Capability declarations for channels + permissions
- Tool-level tests + integration smoke tests
- Marketplace packaging (plugin.json + .mcp.json + ${CLAUDE_PLUGIN_ROOT})

## License

MIT
