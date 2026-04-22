/**
 * Channel capability template.
 *
 * Converts a plain MCP tools server into a channel plugin that can deliver
 * inbound messages to Claude Code via server.notification().
 *
 * Slack-cc learnings encoded here:
 *  - Five-name match (GUARD-003) is THE source of silent breakage
 *  - Dedup survives restarts by persisting to disk
 *  - Outbound is gated — no reply unless inbound arrived or channel opted in
 *  - Access state lives in ~/.claude/channels/<name>/, 0o700, never in repo
 *  - `claude --dangerously-load-development-channels` is required during dev
 *
 * Usage: /mcp-forge-channel substitutes {{SERVER_NAME}} and {{CHANNEL_NAME}},
 * then appends this block to server.ts and updates plugin.json to declare
 * the channel capability.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'

// ---------------------------------------------------------------------------
// State directory — NEVER in the repo. Perms 0o700.
// ---------------------------------------------------------------------------
const STATE_DIR =
  process.env.{{SERVER_NAME_UPPER}}_STATE_DIR ||
  join(homedir(), '.claude', 'channels', '{{SERVER_NAME}}')
mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })

const ACCESS_PATH = join(STATE_DIR, 'access.json')
const DEDUP_PATH = join(STATE_DIR, 'dedup.json')

// ---------------------------------------------------------------------------
// Access control — per-channel/per-user opt-in.
// Default deny. Users opt in via a terminal command, never via the channel
// itself (prevents social-engineered self-grants).
// ---------------------------------------------------------------------------
export interface ChannelPolicy {
  opted_in_at: string
  allowed_users?: string[] // empty/undefined = all users in channel
}

export interface Access {
  channels: Record<string, ChannelPolicy>
}

export function loadAccess(): Access {
  if (!existsSync(ACCESS_PATH)) return { channels: {} }
  return JSON.parse(readFileSync(ACCESS_PATH, 'utf8'))
}

export function saveAccess(access: Access): void {
  writeFileSync(ACCESS_PATH, JSON.stringify(access, null, 2), { mode: 0o600 })
}

// ---------------------------------------------------------------------------
// Dedup — prevents replay of the same inbound event across restarts.
// In-memory set backed by disk. Capped to avoid unbounded growth.
// ---------------------------------------------------------------------------
const DEDUP_CAP = 10_000
const dedupSet = new Set<string>(
  existsSync(DEDUP_PATH) ? JSON.parse(readFileSync(DEDUP_PATH, 'utf8')) : []
)

export function isDuplicate(channelId: string, ts: string): boolean {
  const key = `${channelId}:${ts}`
  if (dedupSet.has(key)) return true
  dedupSet.add(key)
  if (dedupSet.size > DEDUP_CAP) {
    // Drop oldest ~10% when cap hit
    const arr = Array.from(dedupSet)
    dedupSet.clear()
    for (const k of arr.slice(Math.floor(DEDUP_CAP * 0.1))) dedupSet.add(k)
  }
  writeFileSync(DEDUP_PATH, JSON.stringify(Array.from(dedupSet)), { mode: 0o600 })
  return false
}

// ---------------------------------------------------------------------------
// Outbound gate — never reply unless the thread delivered inbound OR the
// channel is explicitly opted in. Prevents the agent from spamming any
// channel the bot happens to be in.
// ---------------------------------------------------------------------------
const deliveredThreads = new Set<string>()

export function trackDelivered(channel: string, threadTs?: string): void {
  deliveredThreads.add(`${channel}:${threadTs || '*'}`)
  deliveredThreads.add(`${channel}:*`)
}

export function assertOutbound(channel: string, threadTs?: string): void {
  const access = loadAccess()
  if (access.channels[channel]) return
  if (deliveredThreads.has(`${channel}:${threadTs || '*'}`)) return
  if (deliveredThreads.has(`${channel}:*`)) return
  throw new Error(
    `Outbound blocked to ${channel} — no inbound delivery or channel opt-in. ` +
      `Opt in via: /{{SERVER_NAME}}:access channel ${channel}`
  )
}

// ---------------------------------------------------------------------------
// notifyChannel — push an inbound event up to Claude Code.
// ---------------------------------------------------------------------------
export interface InboundMessage {
  channel: string
  channel_name?: string
  user: string
  user_name?: string
  text: string
  thread_ts?: string
  ts: string
}

export async function notifyChannel(
  server: Server,
  msg: InboundMessage
): Promise<void> {
  // Dedup first
  if (isDuplicate(msg.channel, msg.ts)) return
  // Gate check — only notify for opted-in channels
  const access = loadAccess()
  if (!access.channels[msg.channel]) return
  // Track so outbound replies are allowed in this thread
  trackDelivered(msg.channel, msg.thread_ts)
  // Send notification
  await server.notification({
    method: 'experimental/claude/channel/message',
    params: {
      channel: '{{SERVER_NAME}}',
      channel_display: '{{CHANNEL_NAME}}',
      channel_id: msg.channel,
      channel_name: msg.channel_name,
      from: { id: msg.user, name: msg.user_name },
      text: msg.text,
      thread_id: msg.thread_ts,
      message_id: msg.ts,
    },
  })
}

// ---------------------------------------------------------------------------
// To declare the capability, update the Server() constructor in server.ts:
//
//   const server = new Server(
//     { name: '{{SERVER_NAME}}', version: '0.1.0' },
//     {
//       capabilities: {
//         tools: {},
//         'experimental/claude/channel': {},
//         'experimental/claude/channel/permission': {},
//       },
//     }
//   )
//
// And in plugin.json:
//   { "name": "{{SERVER_NAME}}", "channels": [{ "server": "{{SERVER_NAME}}" }] }
// ---------------------------------------------------------------------------
