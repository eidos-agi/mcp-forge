---
id: "GUARD-003"
type: "guardrail"
title: "Five names must match — marketplace plugin naming constraint"
status: "active"
date: "2026-04-22"
source: "slack-cc build, 2026-03"
---

## Rule

For every MCP server that ships as an Eidos marketplace plugin, the server name string must appear **identically** in five places. Any mismatch silently breaks tool registration at install time — the plugin installs cleanly, boots without error, and then the tools simply do not appear in the agent's tool list.

## The Five Places

| # | Location | File | Field |
|---|----------|------|-------|
| 1 | Plugin name | `.claude-plugin/plugin.json` | `name` |
| 2 | Channel server | `.claude-plugin/plugin.json` | `channels[].server` (channel plugins only) |
| 3 | MCP server key | `.mcp.json` | `mcpServers.<KEY>` |
| 4 | Server constructor | `server.ts` / `server.py` | `new Server({ name: ... })` or `FastMCP("...")` |
| 5 | Skill prefix | Plugin skills, if any | `mcp__plugin_<name>_<server>__<tool>` |

## Why

This is a product of how Claude Code resolves tool calls across the plugin layer + the MCP layer:
- Claude Code finds the plugin by `plugin.json.name`.
- It finds the MCP server by `.mcp.json` key.
- The MCP server identifies itself by the name passed to `Server()` / `FastMCP()`.
- Tool calls through the plugin layer use the prefix `mcp__plugin_<plugin_name>_<mcp_server_name>__<tool_name>`.

If `plugin.json.name = "slack-cc"` but `new Server({ name: "slackcc" })`, the plugin installs, the server boots, `tools/list` returns tools — and the agent never sees them because the prefix resolution lookup fails silently.

For channel plugins, `channels[].server` adds a fifth point of failure: if it doesn't match, the channel capability isn't registered against the right server.

## Source

Discovered during the slack-cc build (2026-03). Symptom: plugin installed successfully, `claude --mcp-debug` showed the server connected, `tools/list` returned tools over stdio, but no tools appeared in the agent's usable tool list. Spent ~2 hours diffing before finding a single-character mismatch between `plugin.json.name` and the MCP server key.

## How `/mcp-forge-publish` Enforces This

Step 1 of the publish skill extracts the name from each of the five locations and compares them. If any mismatch, it FAILs with:
- The exact diff between each location
- The proposed fix
- A refusal to publish until resolved

Never publish with a mismatch, even as a "we'll fix it in the next release." The plugin is broken for every installer until then, and the install error is invisible.

## Violation Examples

- `plugin.json.name = "my-mcp"` and `.mcp.json` key is `"my_mcp"` (underscore vs hyphen)
- `new Server({ name: "MyMcp" })` and everything else is `"my-mcp"` (camelCase slip)
- `plugin.json.name = "slack-cc"` and `channels[0].server = "slackcc"` (missing hyphen)
- Skill filename prefix `/my-plugin:tool` but plugin name is `my-mcp` (forgetting the skill layer)

## Rules for Naming

- Always kebab-case: `^[a-z][a-z0-9-]*$`
- No underscores, no uppercase, no leading digit
- Pick the name once. Paste it. Do not retype it in any of the five places.
