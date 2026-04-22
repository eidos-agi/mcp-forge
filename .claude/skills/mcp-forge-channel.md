---
name: mcp-forge-channel
description: Add a channel capability (experimental/claude/channel) to an MCP server so it can act as a two-way messaging bridge for Claude Code — Slack, Telegram, Discord, SMS, email, etc. Use when the user says /mcp-forge-channel, asks to "add channel capability", "make this a channel plugin", or "wire up bidirectional messaging".
---

# mcp-forge-channel — Add channel capability to an MCP server

Convert a normal MCP server into a **channel plugin** — a server that can both expose tools AND deliver inbound notifications to Claude Code. This is what powers Slack/Telegram/email bridges.

## Trigger

User says `/mcp-forge-channel`, `/mcp-forge channel`, or asks to add channel/notification/bidirectional messaging to an MCP server.

## Instructions

### Step 0: Precondition check

- There must be an existing MCP server (scaffolded with `/mcp-forge-init`). Channel capability is a layer on top.
- The server must be TypeScript or Python with stdio transport. Channels over HTTP/SSE are not supported by Claude Code today.
- You must be OK with the user running `claude --dangerously-load-development-channels` during dev (slack-cc learning — this flag is required for private marketplace channel plugins).

### Step 1: Gather inputs

| Input | Variable | Notes |
|-------|----------|-------|
| Channel name | `{{CHANNEL_NAME}}` | Human label — "Slack", "Telegram", "SMS". Purely display. |
| Inbound transport | — | How messages arrive: Socket Mode, webhook listener, IMAP poll, polling API. |
| Outbound transport | — | How messages are sent: web API, SMTP, SMS gateway. |
| Permission scheme | — | Default `access-list` per-channel/per-user opt-in. |
| Dedup strategy | — | How to avoid replaying duplicate inbound events across restarts. |

### Step 2: Declare the channel capability

In `server.ts` (or server.py), when constructing the `Server()`, add the `experimental/claude/channel` capability:

```ts
const server = new Server(
  { name: '{{SERVER_NAME}}', version: '0.1.0' },
  {
    capabilities: {
      tools: {},
      'experimental/claude/channel': {},
      'experimental/claude/channel/permission': {},
    },
  }
)
```

### Step 3: Update plugin.json

Add the `channels` array (and keep `server` matching GUARD-003):

```json
{
  "name": "{{SERVER_NAME}}",
  "channels": [{ "server": "{{SERVER_NAME}}" }]
}
```

The `channels[].server` value **must** match `plugin.json.name`, `.mcp.json` server key, and the `new Server({ name })` argument. Five-name match (GUARD-003). Verify before proceeding.

### Step 4: Copy `templates/channel-template.ts`

Contains:
- Notification schema (inbound channel message shape)
- `notifyChannel()` helper — sends inbound events to Claude Code via `server.notification()`
- Access control skeleton (`loadAccess`, `saveAccess`, `assertOutbound`)
- Dedup skeleton (in-memory Set with size cap)

Substitute `{{SERVER_NAME}}`, `{{CHANNEL_NAME}}`, and any transport-specific bits.

### Step 5: Wire the inbound adapter

Attach to the inbound transport (Socket Mode, webhook, IMAP poll). On each message:
1. **Dedup** — ignore if `(channel, ts)` already seen.
2. **Gate** — check access policy; reject if not permitted.
3. **Notify** — call `server.notification({ method: 'experimental/claude/channel/message', params: { ... } })`.
4. **Track delivered** — remember `(channel, threadTs)` so outbound replies are permitted.

### Step 6: Wire the outbound tools

Add at least these tools (via `/mcp-forge-tool`):
- `send_message` — send a message to a channel or thread (must pass `assertOutbound` gate)
- `reply_to_thread` — reply in a specific thread (narrower gate)
- `list_channels` — enumerate available channels with current access status

### Step 7: Add diagnostics

Create a `diagnostics` tool that reports:
- Boot time
- Inbound connection status (connected, reconnecting, failed)
- Last inbound event timestamp
- Access list summary (counts, not tokens)
- Dedup cache size

Agents use this to self-debug when messages aren't flowing.

### Step 8: Document the `--dangerously-load-development-channels` flag

In README.md, add a section:

> **Dev install:** Because this is a channel plugin from a private marketplace, Claude Code requires `--dangerously-load-development-channels` during development. Add it to your shell alias or the invocation, or publish the plugin through a trusted marketplace to avoid the flag.

### Step 9: Verify

1. Typecheck passes.
2. Unit tests for access control, dedup, and gate logic pass.
3. Boot the server locally and confirm:
   - Inbound event arrives
   - `notifyChannel` posts correctly
   - Outbound `send_message` respects the gate
   - Diagnostics tool reports healthy

## Output Format

```
## Channel Added: {{SERVER_NAME}} ({{CHANNEL_NAME}})

### Capabilities declared
- tools
- experimental/claude/channel
- experimental/claude/channel/permission

### Tools added
- send_message
- reply_to_thread
- list_channels
- diagnostics

### Inbound transport: <what>
### Outbound transport: <what>
### Access policy: <scheme>
### Dedup: <strategy>

### Five-name match: PASS/FAIL
- plugin.json.name: {{SERVER_NAME}}
- plugin.json.channels[0].server: {{SERVER_NAME}}
- .mcp.json key: {{SERVER_NAME}}
- new Server({ name }): {{SERVER_NAME}}
- skill prefix: {{SERVER_NAME}}

### Next: /mcp-forge-test to harden, /mcp-forge-publish to ship
```

## Rules

- **Five-name match is mandatory** (GUARD-003). This is the #1 source of silent breakage from the slack-cc build. Check it twice.
- **Never reply to a channel that hasn't opted in.** Outbound must pass a gate — inbound delivery or an explicit opt-in command.
- **Dedup across restarts.** In-memory dedup loses state; persist the `(channel, ts)` set to `~/.claude/channels/<name>/dedup.json` or equivalent.
- **No secrets in the repo.** Tokens go in an `.env` file that is gitignored, loaded at boot from a path documented in the README.
- **Always add a diagnostics tool.** When messages don't flow, the diag tool is the first thing the user reaches for.
- **Access state lives outside the repo** — `~/.claude/channels/<name>/access.json`, `700` perms.
- **Document `--dangerously-load-development-channels`** in the README so users aren't mystified when the plugin doesn't load.
