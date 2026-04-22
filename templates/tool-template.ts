/**
 * Tool template — single MCP tool with zod schema and handler.
 *
 * Usage: /mcp-forge-tool substitutes {{TOOL_NAME}}, {{TOOL_DESC}}, etc.,
 * then appends this block to server.ts and wires it into the
 * ListToolsRequestSchema / CallToolRequestSchema handlers.
 *
 * Rules (encoded as comments — keep when copying):
 *  - Name is verb_noun, lower_snake (query_gold, run_sql, verify_page)
 *  - Description is for agents, not humans — include what it returns
 *  - Structured output over free text (return JSON, not prose)
 *  - Errors return { isError: true }, never thrown — thrown exceptions
 *    corrupt the stdio stream and kill the session
 *  - Auth via env vars, never hardcoded
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema — validates tool input. Every field gets .describe() so the
// inputSchema that agents see matches the runtime validator.
// ---------------------------------------------------------------------------
export const {{TOOL_NAME}}Schema = z.object({
  // {{TOOL_SCHEMA}} — replace with your fields. Example:
  // target: z.string().describe('The thing to operate on'),
  // limit: z.number().int().min(1).max(100).default(10).describe('Max rows'),
})

// ---------------------------------------------------------------------------
// Tool registration object — what gets returned from tools/list
// ---------------------------------------------------------------------------
export const {{TOOL_NAME}}Tool = {
  name: '{{TOOL_NAME}}',
  description: '{{TOOL_DESC}}',
  inputSchema: {
    type: 'object',
    properties: {
      // Keep in sync with {{TOOL_NAME}}Schema above.
      // Prefer generating this via zodToJsonSchema() if the project has it.
    },
    required: [],
  },
}

// ---------------------------------------------------------------------------
// Handler — the actual work. Always returns { content: [...] } structure.
// On failure, set isError: true — do not throw.
// ---------------------------------------------------------------------------
export async function handle_{{TOOL_NAME}}(
  args: z.infer<typeof {{TOOL_NAME}}Schema>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    // {{TOOL_OUTPUT}} — replace with real implementation.
    const result = { ok: true, args }
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
            code: 'TOOL_FAILED',
          }),
        },
      ],
      isError: true,
    }
  }
}

// ---------------------------------------------------------------------------
// Registration snippet to paste into server.ts
// ---------------------------------------------------------------------------
// In ListToolsRequestSchema handler:
//   tools.push({{TOOL_NAME}}Tool)
//
// In CallToolRequestSchema handler switch:
//   case '{{TOOL_NAME}}': {
//     const parsed = {{TOOL_NAME}}Schema.safeParse(args ?? {})
//     if (!parsed.success) {
//       return {
//         content: [{ type: 'text', text: `Schema error: ${parsed.error.message}` }],
//         isError: true,
//       }
//     }
//     return handle_{{TOOL_NAME}}(parsed.data)
//   }
