---
id: "GOAL-002"
type: "goal"
title: "Ship both TypeScript and Python scaffolds — same patterns, two stacks"
status: "in-progress"
date: "2026-04-22"
depends_on: ["GOAL-001"]
unlocks: []
---

The templates/ directory ships language-parallel scaffolds so teams can pick the stack they prefer without losing the encoded patterns:

| Template | Language | Role |
|----------|----------|------|
| `server-ts.ts` | TypeScript | Full MCP server scaffold using `@modelcontextprotocol/sdk`, stdio transport, one example tool |
| `server-py.py` | Python | Equivalent using `mcp` package's FastMCP pattern |
| `tool-template.ts` | TypeScript | Single tool definition — schema, handler, error envelope, registration snippet |
| `channel-template.ts` | TypeScript | Channel capability — access control, dedup, outbound gate, notify helper |
| `marketplace-entry.json` | JSON | Combined plugin.json + .mcp.json scaffold with inline GUARD-003 enforcement notes |

## Why both languages

- TypeScript is the dominant MCP server language today (`@modelcontextprotocol/sdk` is the reference implementation, slack-cc is TS).
- Python is the dominant language for AI/ML tooling and data workflows — the places where new MCP servers are most likely to be written in the Eidos ecosystem (Ojo, Omni, eidos-v5).
- Forcing one language creates friction. Letting teams pick the stack they'd write in anyway removes a whole category of "but we use Python" pushback.

## Why not more languages

- Go, Rust, etc. are theoretically supported by MCP via any stdio-speaking process. But the MCP SDK coverage is weaker outside TS/Python, and no current Eidos project uses them for MCP servers. Add when a real need appears.

## Channel template is TypeScript-only (for now)

The channel pattern is complex enough (access control, dedup, outbound gating, notify) that maintaining two fully-equivalent language templates right now would double the maintenance burden. TypeScript is the channel baseline because slack-cc is TS. Python channel support is a future goal — add when the first Python channel plugin needs it.

## Substitution contract

All templates use `{{VARIABLE}}` placeholder syntax. No Jinja, no Python f-strings, no JS template literals. The contract:

- `{{SERVER_NAME}}` — the name that appears in all five GUARD-003 places
- `{{TOOL_NAME}}` — single tool, `verb_noun` lower_snake
- `{{TOOL_DESC}}` — one-line tool description for the tools/list handler
- `{{TOOL_SCHEMA}}` — zod/pydantic schema body
- `{{TOOL_OUTPUT}}` — shape of the returned content
- `{{DESCRIPTION}}` — server-level description for plugin.json
- `{{CHANNEL_NAME}}` — human-readable channel label (channel plugins only)
- `{{SERVER_NAME_UPPER}}` — UPPER_SNAKE of SERVER_NAME for env vars

Skills do literal string replacement. If any `{{VARIABLE}}` remains after substitution, that's a bug — the skill must fail and surface the unresolved placeholder.

## Definition of Done

- All five templates exist under `templates/`
- Every template uses `{{VARIABLE}}` substitution consistently
- Every template is self-contained (no imports from mcp-forge itself — see GUARD-001)
- TypeScript templates pass `tsc --noEmit` when placeholders are replaced with valid values
- Python template runs `python -c "import server"` cleanly when placeholders are replaced
- `marketplace-entry.json` splits cleanly into a valid `plugin.json` and a valid `.mcp.json`
