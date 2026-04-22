---
name: mcp-forge-test
description: Generate a test harness for an MCP server — unit tests per tool plus an integration smoke test that spawns the server over stdio and exercises every registered tool. Use when the user says /mcp-forge-test, "write tests for this MCP", or "add a test harness".
---

# mcp-forge-test — Generate a test harness for MCP tools

Stand up (or harden) the test suite for an MCP server. Two layers:
1. **Unit tests** per tool — schema validation, handler logic, error paths.
2. **Integration smoke test** — spawn the actual server over stdio, call `tools/list`, invoke every tool, verify structured output.

## Trigger

User says `/mcp-forge-test`, `/mcp-forge test`, or asks to write/add/generate tests for an MCP server.

## Instructions

### Step 0: Scan the server

- Read `server.ts` (or `server.py`).
- Enumerate registered tools from the `ListToolsRequestSchema` handler or `@mcp.tool()` decorators.
- For each tool, capture: name, schema, handler function, any env vars it reads.

### Step 1: Determine test runner

- TypeScript: `tsx --test` (node built-in test runner with tsx loader) is the default — zero extra deps.
- Python: `pytest` with `pytest-asyncio` for FastMCP tools.
- If the project already has a test runner configured, use that.

### Step 2: Generate unit tests (one per tool)

For each tool, generate a test block:

```ts
test('{{TOOL_NAME}} — valid input', async () => {
  const result = await handle_{{TOOL_NAME}}(validArgs)
  assert.ok(result.content)
  assert.equal(result.isError, undefined)
})

test('{{TOOL_NAME}} — schema rejects bad input', () => {
  const parse = {{TOOL_NAME}}Schema.safeParse({ /* missing required field */ })
  assert.equal(parse.success, false)
})

test('{{TOOL_NAME}} — returns structured error on failure', async () => {
  // Force an error condition (e.g., missing env var, bad API response)
  const result = await handle_{{TOOL_NAME}}(argsThatFail)
  assert.equal(result.isError, true)
})
```

Mock external dependencies (HTTP calls, Slack client, DB) at the handler boundary. Do not hit real APIs in unit tests.

### Step 3: Generate an integration smoke test

One test that spawns the server as a child process and speaks MCP over stdio:

```ts
test('integration: server lists and calls every tool', async () => {
  const proc = spawn('npx', ['tsx', 'server.ts'], { stdio: ['pipe', 'pipe', 'inherit'] })
  const client = new MCPStdioClient(proc)
  await client.initialize()

  const { tools } = await client.request({ method: 'tools/list' })
  assert.ok(tools.length > 0)

  for (const tool of tools) {
    const result = await client.request({
      method: 'tools/call',
      params: { name: tool.name, arguments: minimalArgsFor(tool) },
    })
    assert.ok(result.content, `${tool.name} returned no content`)
  }

  proc.kill()
})
```

For channel plugins, add a `notifyChannel` round-trip test — simulate an inbound event, assert the notification reaches the test harness.

### Step 4: Add env var fixtures

MCP servers typically read secrets from env vars. For tests:
- Create `test.env.example` with every env var the server reads, with placeholder values.
- In the test file, set minimal env vars (`SLACK_BOT_TOKEN=test`, `SLACK_APP_TOKEN=test`) before spawning.
- Mock the actual API client to return canned responses — the test should not need real credentials.

### Step 5: Add coverage commands to package.json

```json
"scripts": {
  "test": "tsx --test server.test.ts",
  "test:watch": "tsx --test --watch server.test.ts",
  "test:integration": "tsx --test integration.test.ts"
}
```

(Python: add equivalents to `pyproject.toml` scripts table or a Makefile.)

### Step 6: Verify

1. Run the suite. All tests must pass.
2. Run with a deliberately broken tool (inject a typo) — confirm the suite catches it.
3. If coverage is part of the project, report coverage %.

## Output Format

```
## Test Harness: <server-name>

### Tools tested: <N>
| Tool | Unit test | Error test | Schema test |
|------|-----------|------------|-------------|
| query_gold | ✓ | ✓ | ✓ |
| ... | ... | ... | ... |

### Integration smoke: PASS — spawned server, listed N tools, called each
### Channel round-trip: PASS/N/A

### Coverage (if available): <%>

### Env var fixtures: test.env.example written

### Next: /mcp-forge-publish when ready
```

## Rules

- **Mock at the adapter boundary.** Don't hit real Slack/HTTP/DB in unit tests.
- **Stdio in integration tests, not direct function calls.** This is the only way to catch transport-layer bugs.
- **Every tool must have at least: valid-input, schema-reject, error-path tests.** Three tests per tool, minimum.
- **Test should run without secrets.** If the suite needs real tokens, something is wrong — mock harder.
- **Never skip the integration smoke test.** Unit tests pass while tools silently fail to register is a real failure mode.
- **Fail loud on missing tools.** If the server declares a tool and the suite doesn't cover it, WARN in the output and suggest adding a test.
