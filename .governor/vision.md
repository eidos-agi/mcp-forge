---
title: "mcp-forge — Build MCP servers the right way, the first time"
type: "vision"
date: "2026-04-22"
---

## North Star

mcp-forge exists for one reason: **every MCP server built in the Eidos AGI ecosystem is built on the same battle-tested patterns — so tools compose, plugins install cleanly, and the decisions that compound (naming, schemas, error handling, auth, capabilities) are made once and reused everywhere.**

Model Context Protocol servers are the tissue between Claude and the world. Getting them wrong early means refactoring every consumer. Getting them right means the agent ecosystem stays coherent as it grows from 5 servers to 50.

## What mcp-forge Cares About (in priority order)

### 1. The MCP-vs-CLI Decision (most important)
Most "we need an MCP" impulses are actually "we need a CLI." MCP is the right choice for:
- Consumers without shell access (claude.ai, remote agents)
- Stateful tools (connections, sessions, caches)
- Channel plugins (Slack, Telegram, Discord — MCP is required here)
- Typed params + structured outputs where the consumer will burn tokens parsing prose

CLI is the right choice for:
- Claude Code, Cursor, CI — anywhere the agent can shell out
- Token-sensitive contexts (50 MCP tools = ~9K context tokens before you ask a question)
- Wrappers around REST APIs
- Pipeable composition

mcp-forge starts every `/mcp-forge-init` call with this decision.

### 2. The Patterns That Compound
Tool naming (`verb_noun`), structured errors (`isError: true`, never throw), env-var auth, capability declarations, the five-name match for marketplace plugins. These are small choices that become immovable once adopted. mcp-forge encodes them as defaults.

### 3. Tests That Prove Transport, Not Just Logic
Stdio is where MCP servers silently break. Unit tests that import handlers directly pass while the real plugin fails to register tools. mcp-forge mandates an integration smoke test that spawns the server and exercises it over stdio.

### 4. Marketplace Readiness
Eidos marketplace distribution has specific requirements (`${CLAUDE_PLUGIN_ROOT}`, npm-install-in-start, the five-name match, the `--dangerously-load-development-channels` flag for channel plugins). mcp-forge-publish verifies all of them before the user hits "ship."

## What mcp-forge IS

- A set of Claude Code skills that scaffold, extend, test, and publish MCP servers.
- A library of file templates with `{{VARIABLE}}` substitution.
- An encoded playbook of the gotchas learned building slack-cc.

## What mcp-forge is NOT

- Not an MCP server itself. (Forge-standard: no software. See GUARD-001.)
- Not a runtime. It generates scaffolds; the servers stand on their own.
- Not opinionated about domain. It's protocol and packaging knowledge — what your server *does* is up to you.
- Not a replacement for `document-skills:mcp-builder`. That skill is a general MCP builder; mcp-forge is specifically the Eidos-AGI-marketplace-and-patterns flavor.

## Success Metric

Every new MCP server in the Eidos AGI ecosystem was scaffolded with `/mcp-forge-init`, extended with `/mcp-forge-tool`, tested with `/mcp-forge-test`, and shipped with `/mcp-forge-publish` — and installing any of them as a marketplace plugin works on the first try.
