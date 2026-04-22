---
id: "GUARD-002"
type: "guardrail"
title: "Decide MCP vs CLI before scaffolding — most of the time, CLI wins"
status: "active"
date: "2026-04-22"
---

## Rule

`/mcp-forge-init` must not scaffold an MCP server until the user has answered the MCP-vs-CLI decision. If the consumer has shell access and the tool isn't stateful and isn't a channel plugin, MCP is the wrong choice — redirect to `cli-forge`.

## The Decision Table

| Factor | Choose MCP when | Choose CLI when |
|--------|-----------------|-----------------|
| Consumer | Remote agent, claude.ai, browser | Claude Code, Cursor, CI, humans |
| State | Connections, sessions, caches to maintain | Stateless request/response |
| Output | Structured data that agents consume | Text + exit codes |
| Token cost | Agent benefits from typed params | Every tool adds ~180 tokens; 50 tools = ~9K |
| Composition | Within one agent session | Piped: `foo \| jq \| bar` |
| Channels (Slack, etc.) | Required — MCP is the only way | N/A |
| API wrapping | Tool wraps a library with state | Tool wraps a REST endpoint |

## Why

- **Token budget is real.** 50 MCP tools loaded into context is ~9K tokens the agent pays for on every turn, regardless of whether any tool is called. A CLI invoked by name costs nothing until it's called.
- **Shell pipeability is a superpower.** `claude-in-chrome | jq '.tabs[].url' | xargs -I{} curl -s {}` is impossible with an MCP server.
- **MCP is heavier to ship.** Five-name match, marketplace packaging, `${CLAUDE_PLUGIN_ROOT}`, install-in-start script. A CLI is `pip install` and done.
- **Reach for MCP deliberately.** When it's the right tool, it's invaluable. When it's not, it bloats context and complicates distribution.

## Violation Examples

- Scaffolding an MCP wrapper for the GitHub REST API when `gh` already exists and the user has shell access.
- Adding an MCP tool when a 10-line shell script would do.
- Converting a working CLI to MCP because "MCP is the new thing."
- Building an MCP server for a one-off task with no state and no repeat use.

## Legitimate MCP Cases

- **Channels**: Slack, Telegram, Discord, SMS, email bridges. MCP is required because only MCP exposes `experimental/claude/channel` capability.
- **Stateful connections**: WebSocket clients, persistent Socket Mode sessions, streaming data feeds.
- **Structured introspection**: Tools that return typed schemas the agent reasons over (e.g., database schema browsers).
- **Remote/hosted access**: When the consumer has no shell (claude.ai, remote agents).

## How `/mcp-forge-init` Enforces This

Step 0 of the skill paraphrases this table back to the user and asks the four decision questions. If the answer is CLI, the skill stops and points at `cli-forge`. It does not scaffold an MCP server "just in case."
