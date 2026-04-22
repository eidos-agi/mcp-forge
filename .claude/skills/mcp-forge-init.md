---
name: mcp-forge-init
description: Scaffold a new MCP (Model Context Protocol) server — TypeScript or Python — with stdio transport, one example tool, and the correct file layout to publish to the Eidos marketplace later. Use when the user says /mcp-forge-init, asks to "start an MCP server", "scaffold an MCP", or "create a new MCP plugin".
---

# mcp-forge-init — Scaffold a new MCP server

Create a working MCP server in a target project directory. TypeScript or Python, stdio transport, one tool wired up, tests runnable, and ready to extend with `/mcp-forge-tool`.

## Trigger

User says `/mcp-forge-init`, `/mcp-forge init`, or asks to create/scaffold/bootstrap/start a new MCP server.

## Instructions

### Step 0: Decide — MCP or CLI?

Before scaffolding anything, confirm MCP is actually the right call. Read `.visionlog/guardrails/GUARD-002-mcp-vs-cli-decision.md` (or paste the MCP vs CLI table from this forge's CLAUDE.md) back to the user and ask:

- Does the consumer have shell access? If yes → CLI is probably better. Stop.
- Is the tool stateful (connections, sessions, caches)? If yes → MCP.
- Is this a channel plugin (Slack, Telegram, Discord)? If yes → MCP is required.
- Do you need typed parameters and structured outputs? If yes → MCP.

If the answer is CLI, direct the user to `cli-forge` and stop.

### Step 1: Gather inputs

Ask once, in one message. Do not prompt serially.

| Input | Variable | Default | Notes |
|-------|----------|---------|-------|
| Server name (kebab-case) | `{{SERVER_NAME}}` | — | Must match five places (GUARD-003). Example: `slack-cc`, `ojo-mcp`. |
| Language | — | TypeScript | TypeScript (`@modelcontextprotocol/sdk`) or Python (`mcp` / FastMCP). |
| First tool name (verb_noun) | `{{TOOL_NAME}}` | `hello_world` | Lower-snake. Verbs: `query_`, `list_`, `create_`, `verify_`, `run_`. |
| Target directory | — | `./` | Where to write files. |
| Description (one line) | `{{DESCRIPTION}}` | — | For plugin.json + README. |

Validate the server name: `^[a-z][a-z0-9-]*$`. Reject names with underscores, uppercase, or leading digits — marketplace names must be kebab-case.

### Step 2: Verify the target directory is empty (or confirm overwrite)

- Run `ls -la <target>`.
- If non-empty (excluding `.git`, `LICENSE`, `README.md`, `.gitignore`), STOP and confirm with the user before proceeding.
- **Never overwrite** existing files without explicit permission.

### Step 3: Copy the scaffold

From this forge's `templates/`:

**For TypeScript:**
- `server-ts.ts` → `<target>/server.ts`
- Plus write a minimal `package.json` (see Output Format below)
- Plus write a minimal `tsconfig.json`

**For Python:**
- `server-py.py` → `<target>/server.py`
- Plus write a minimal `pyproject.toml` (see Output Format below)

Then copy:
- `marketplace-entry.json` → split into `<target>/.claude-plugin/plugin.json` + `<target>/.mcp.json`

Substitute `{{SERVER_NAME}}`, `{{TOOL_NAME}}`, `{{DESCRIPTION}}` throughout. Do all substitutions with literal string replacement — no Jinja, no f-strings.

### Step 4: Wire up tests

Create `<target>/server.test.ts` (or `test_server.py`) that:
1. Spawns the server over stdio.
2. Calls `tools/list` — asserts `{{TOOL_NAME}}` is present.
3. Calls `tools/call` with `{{TOOL_NAME}}` — asserts no error and structured output.

### Step 5: Verify it runs

Run the smoke test once:
- TypeScript: `npm install --no-audit --no-fund && npx tsx server.ts < /dev/null & sleep 1 && kill %1` (just confirms it boots)
- Python: `python -m server --help` (or equivalent)

If it fails to boot, surface the error and stop. Do not hand off a broken scaffold.

### Step 6: Print the next steps

Tell the user:
1. Run `/mcp-forge-tool` to add more tools.
2. Run `/mcp-forge-test` to harden the test suite.
3. Run `/mcp-forge-publish` when ready to ship to the marketplace.

## Output Format

Write these files (TypeScript path shown; Python equivalents follow the same shape):

```
<target>/
├── server.ts                     ← from templates/server-ts.ts (substituted)
├── server.test.ts                ← smoke test
├── package.json                  ← minimal: @modelcontextprotocol/sdk, zod, tsx, typescript
├── tsconfig.json                 ← node ESM module resolution
├── .mcp.json                     ← { "mcpServers": { "{{SERVER_NAME}}": { command: "npm", args: ["start", "--prefix", "${CLAUDE_PLUGIN_ROOT}"] } } }
├── .claude-plugin/
│   └── plugin.json               ← name = {{SERVER_NAME}}, channels.server = {{SERVER_NAME}} (if channel plugin)
└── README.md                     ← describes the server and its one tool
```

`package.json` must include the npm install in start script (slack-cc learning):

```json
"scripts": {
  "start": "npm install --no-fund --no-audit --silent && tsx server.ts",
  "test": "tsx --test server.test.ts",
  "typecheck": "tsc --noEmit"
}
```

## Rules

- **Five names must match** (GUARD-003): plugin.json `name`, `channels[].server`, `.mcp.json` server key, `new Server({ name })`, and skill prefix all must equal `{{SERVER_NAME}}`. Verify this as the final step — if any mismatch, fix before reporting success.
- **Tool names are verb_noun** in lower_snake. Never camelCase, never just a noun.
- **Stdio transport only** — never HTTP/SSE for v0. That's a later decision.
- **No placeholders** — every `{{VARIABLE}}` must be substituted. `grep -r '{{' <target>` should return nothing from your writes.
- **The scaffold must run** before you report done. Boot test is mandatory.
- **Never write secrets.** Auth goes through env vars documented in the README, never into the repo.
- **Don't overwrite** existing files without explicit user confirmation.
