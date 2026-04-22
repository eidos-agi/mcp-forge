---
name: mcp-forge-publish
description: Package an MCP server for the Eidos marketplace — validate plugin.json, .mcp.json, the five-name match, npm-install-in-start, and produce the final distributable shape. Use when the user says /mcp-forge-publish, "ship this MCP", "publish to marketplace", or "make this a plugin".
---

# mcp-forge-publish — Package an MCP server for marketplace distribution

Verify and finalize an MCP server so it can be installed as an Eidos marketplace plugin. This is the last mile — by the time this skill runs, the server already works standalone. The job is to get the packaging exactly right so `claude plugin install` works without surprise.

## Trigger

User says `/mcp-forge-publish`, `/mcp-forge publish`, or asks to ship/publish/package an MCP server for the marketplace.

## Instructions

### Step 0: Preconditions

- The server boots and all tests pass (run `/mcp-forge-test` first if unsure).
- The repo is a git repo with a clean-ish tree.
- `README.md` exists and describes every tool.
- `LICENSE` file is present.

If any of these is missing, stop and fix before proceeding.

### Step 1: Verify the five-name match (GUARD-003)

This is THE big one. Five places must all use the exact same server name:

| # | Location | File | Field |
|---|----------|------|-------|
| 1 | Plugin name | `.claude-plugin/plugin.json` | `name` |
| 2 | Channel server | `.claude-plugin/plugin.json` | `channels[].server` (if channel plugin) |
| 3 | MCP server key | `.mcp.json` | `mcpServers.<key>` |
| 4 | Server constructor | `server.ts` / `server.py` | `new Server({ name: ... })` |
| 5 | Skill prefix | Plugin skills, if any | `mcp__plugin_<name>_<server>__<tool>` |

Extract the name from each location. If any differs, FAIL loudly with a diff and the fix. Do not publish with a mismatch — the plugin will install but silently fail to register tools.

### Step 2: Validate `.mcp.json`

Must use `${CLAUDE_PLUGIN_ROOT}` for any path, never absolute paths:

```json
{
  "mcpServers": {
    "{{SERVER_NAME}}": {
      "command": "npm",
      "args": ["start", "--prefix", "${CLAUDE_PLUGIN_ROOT}"]
    }
  }
}
```

- `command: "npm"` with `args: ["start", "--prefix", "${CLAUDE_PLUGIN_ROOT}"]` is the canonical TS pattern.
- Python equivalent: `"command": "python"`, `"args": ["${CLAUDE_PLUGIN_ROOT}/server.py"]` plus an install hook via `${CLAUDE_PLUGIN_ROOT}/requirements.txt`.
- Any absolute path? FAIL. Any hardcoded user directory? FAIL.

### Step 3: Validate `package.json` start script (slack-cc learning)

For TypeScript plugins, the start script MUST install deps:

```json
"scripts": {
  "start": "npm install --no-fund --no-audit --silent && tsx server.ts"
}
```

Marketplace plugins do NOT auto-run `npm install`. If the start script doesn't install, the plugin will fail on first use on every machine. FAIL if the `npm install` is missing.

For Python: an equivalent `pip install -r requirements.txt` at startup, or use `uv run` which handles deps implicitly.

### Step 4: Validate `plugin.json`

Required fields:
- `name` (kebab-case, matches five-name)
- `version` (semver)
- `description` (one line, clear, for humans browsing the marketplace)
- `author.name`
- `license` (usually `"MIT"`)
- `keywords` (array, at least 3)

For channel plugins:
- `channels` array with `server` matching the name

### Step 5: Verify the install dry-run

Simulate installation:

1. Create a temp directory (`/tmp/mcp-forge-publish-<name>-<timestamp>`).
2. Copy the repo contents (minus `node_modules`, `.git`).
3. Set `CLAUDE_PLUGIN_ROOT=<temp>` and run the `.mcp.json` command.
4. The server must boot, respond to `initialize`, and list tools.
5. Clean up the temp dir.

If boot fails in the temp dir but works in-place, something is using an absolute path. Find it, fix it, re-verify.

### Step 6: README sanity

Check the README includes:
- A **one-sentence** description at the top.
- An **Install** section with the exact `claude plugin install` command (or marketplace path).
- For channel plugins: a note about `--dangerously-load-development-channels` during development.
- A **Tools** section listing every tool with a one-line description.
- An **Auth** section naming every env var the server reads.
- A **Development** section with setup and test commands.

### Step 7: Version bump & tag

- Bump `plugin.json.version` and `package.json.version` (keep them in sync — publishing them out of sync is a common foot-gun).
- Create a git tag: `git tag v<version>` (or `<server-name>-v<version>` if the repo hosts multiple plugins).
- Do not push — that's the user's call.

### Step 8: Produce the final artifact list

```
## Publish Ready: {{SERVER_NAME}} v<version>

### Five-name match: PASS
- plugin.json.name: {{SERVER_NAME}}
- plugin.json.channels[0].server: {{SERVER_NAME}}  (channel plugins only)
- .mcp.json key: {{SERVER_NAME}}
- new Server({ name }): {{SERVER_NAME}}
- skill prefix: mcp__plugin_{{SERVER_NAME}}_{{SERVER_NAME}}__<tool>

### .mcp.json: uses ${CLAUDE_PLUGIN_ROOT}, no absolute paths — PASS
### package.json: start script includes npm install — PASS
### Install dry-run: boot + tools/list in temp dir — PASS
### README: one-sentence header, Install, Tools, Auth, Development — PASS
### Tests: <N> pass
### Version: v<version> — tag created, NOT pushed
```

## Rules

- **Never publish with a five-name mismatch.** That's the guardrail. Period.
- **Never use absolute paths in `.mcp.json`.** Always `${CLAUDE_PLUGIN_ROOT}`.
- **Start script MUST install deps** (slack-cc learning). Marketplace doesn't do this for you.
- **Channel plugins: note the dev flag.** Users will blame you if they don't know about `--dangerously-load-development-channels`.
- **Keep plugin.json.version and package.json.version in sync.** One version, one source of truth.
- **Do the install dry-run.** It catches the gnarly stuff — missing deps, absolute paths, missing env var fallbacks.
- **Don't push the tag.** Creating it is fine; pushing is a user-authorized action.
- **No secrets in the artifact.** Verify `.env`, `access.json`, and any credentials are gitignored before shipping.
