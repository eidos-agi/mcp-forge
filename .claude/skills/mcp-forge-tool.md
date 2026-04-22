---
name: mcp-forge-tool
description: Add a new tool to an existing MCP server — schema (zod/pydantic), handler, list registration, and a unit test. Use when the user says /mcp-forge-tool, "add an MCP tool", or "add a tool to <server>".
---

# mcp-forge-tool — Add a tool to an existing MCP server

Add a single, well-formed tool to an existing MCP server scaffolded by `/mcp-forge-init` (or any server that follows the same patterns). Schema, handler, registration, test — all in one pass.

## Trigger

User says `/mcp-forge-tool`, `/mcp-forge tool`, or asks to add a new tool/capability/function to an MCP server.

## Instructions

### Step 0: Locate the server

- Find `server.ts` or `server.py` in the current project.
- If not found, ask the user for the path, or suggest `/mcp-forge-init` first.
- Read the existing tool list to avoid duplicate names.

### Step 1: Gather inputs in one pass

| Input | Variable | Rule |
|-------|----------|------|
| Tool name | `{{TOOL_NAME}}` | `verb_noun`, lower_snake, no duplicates |
| What it does (one line) | `{{TOOL_DESC}}` | Goes into the tool description — agents read this to pick the tool |
| Input schema | `{{TOOL_SCHEMA}}` | Named fields with types and one-line descriptions |
| Output shape | `{{TOOL_OUTPUT}}` | Object with `content` array; prefer structured over free text |
| Auth requirement | — | Env var name (if any), never hardcoded |

### Step 2: Name validation

Reject the name if:
- Not `verb_noun` (e.g., `users`, `slackMessage`, `get-data` are all wrong)
- Verb isn't in the allowed list: `query_`, `list_`, `get_`, `create_`, `update_`, `delete_` (soft only), `run_`, `verify_`, `send_`, `fetch_`, `analyze_`, `search_`, `reply_`
- Duplicates an existing tool in the server

Suggest a corrected name. Do not proceed until the user confirms.

### Step 3: Generate the tool from `templates/tool-template.ts`

Copy `templates/tool-template.ts` and substitute variables. The shape is:

```ts
// In server.ts — add to the tools array
const {{TOOL_NAME}}Schema = z.object({
  // ...fields with .describe() on each
})

const {{TOOL_NAME}}Tool = {
  name: '{{TOOL_NAME}}',
  description: '{{TOOL_DESC}}',
  inputSchema: zodToJsonSchema({{TOOL_NAME}}Schema),
}

async function handle_{{TOOL_NAME}}(args: z.infer<typeof {{TOOL_NAME}}Schema>) {
  // ... implementation
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  }
}
```

Python (FastMCP):
```python
@mcp.tool()
async def {{TOOL_NAME}}({{TOOL_ARGS}}) -> dict:
    """{{TOOL_DESC}}"""
    # ... implementation
    return {"ok": True, "data": result}
```

### Step 4: Register it

Insert the tool into:
1. The `ListToolsRequestSchema` handler — append to the returned array.
2. The `CallToolRequestSchema` handler — add a `case '{{TOOL_NAME}}':` branch that validates args with the schema and calls the handler.

### Step 5: Add a test

Append to `server.test.ts`:

```ts
test('{{TOOL_NAME}} returns structured output', async () => {
  const result = await callTool('{{TOOL_NAME}}', { /* minimal valid args */ })
  assert.ok(result.content)
  assert.equal(result.isError, undefined)
})
```

### Step 6: Verify

1. Run `npm run typecheck` (or `mypy` for Python). Must pass.
2. Run `npm test` (or `pytest`). The new test must pass.
3. If a `tools/list` smoke test exists, run it and confirm the new tool appears.

### Step 7: Update the README

Append to the tool list in README.md — agents reading the README should see what this tool does without reading the source.

## Output Format

Report back:

```
## Tool Added: {{TOOL_NAME}}

### Schema
<fields with types>

### Handler location
server.ts:<line> — handle_{{TOOL_NAME}}

### Registered in
- ListToolsRequestSchema handler
- CallToolRequestSchema handler

### Tests
server.test.ts:<line> — "{{TOOL_NAME}} returns structured output" ✓

### Typecheck: PASS
### Tests: PASS

### Next: <what to do now — add another tool, ship, etc.>
```

## Rules

- **verb_noun, lower_snake only.** Rename aggressively if wrong.
- **Description is for agents, not humans.** Write it so another agent can pick the right tool from the list. Include what it returns, not just what it does.
- **Structured output over free text.** Return JSON blobs agents can parse, not prose. `content: [{ type: 'text', text: JSON.stringify(...) }]` is the minimum bar.
- **Errors return `isError: true`**, not thrown exceptions. Agents handle structured errors; thrown errors corrupt the stdio stream.
- **Zod (or pydantic) schemas always.** Never trust tool input. Always validate.
- **Auth via env vars** — never read from config files the repo controls. Document the env var in README.
- **One commit per tool** — keeps history readable.
