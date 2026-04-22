---
id: "GOAL-001"
type: "goal"
title: "Five skills cover the MCP server lifecycle: init, tool, channel, test, publish"
status: "in-progress"
date: "2026-04-22"
depends_on: []
unlocks: ["GOAL-002"]
---

Five Claude Code skills, each a single markdown file in `.claude/skills/`, covering the full lifecycle of an MCP server in the Eidos AGI ecosystem:

| Skill | Lifecycle phase | What it does |
|-------|-----------------|--------------|
| `/mcp-forge-init` | Scaffold | Stand up a new MCP server (TypeScript or Python) with stdio transport and one example tool |
| `/mcp-forge-tool` | Extend | Add a single well-formed tool — zod/pydantic schema, handler, registration, test |
| `/mcp-forge-channel` | Capability | Add `experimental/claude/channel` for messaging bridges (Slack, Telegram, etc.) |
| `/mcp-forge-test` | Harden | Generate unit tests per tool plus a stdio integration smoke test |
| `/mcp-forge-publish` | Ship | Validate marketplace packaging (five-name match, `${CLAUDE_PLUGIN_ROOT}`, install-in-start) |

## Why five, not more

- `init` and `tool` handle the 80% daily workflow.
- `channel` is a distinct capability with enough surface area (auth, dedup, outbound gating) to warrant its own skill.
- `test` is separate because the "add tests later" trap is real — making it a first-class skill reduces the friction to running it.
- `publish` is separate because shipping has its own checklist (five-name match, version sync, install dry-run) that has nothing to do with tool-level work.

## Why not more

- Domain-specific variants (SQL MCP, HTTP MCP, file-watcher MCP) can be added as templates, not skills. A sixth skill starts to bloat the forge.
- Operational skills (logs, deploy, monitor) belong in other forges (`ship-forge`, infra repos) — mcp-forge is the *build* forge.

## Definition of Done

- All five skill files exist in `.claude/skills/`
- Each file has the standard shape: frontmatter (name, description), Trigger, Instructions (numbered steps), Output Format, Rules
- Each skill references the relevant templates by filename
- Each skill references the relevant GUARDs by ID where applicable
- `/mcp-forge-init` is proven end-to-end against a dummy target directory before this goal is closed
