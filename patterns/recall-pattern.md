# The Recall Pattern

## Problem

MCP tools that depend on external processes (CI, deploys, migrations, builds) create a polling problem. The agent can't sleep between tool calls, so it rapid-fire polls — burning 15+ calls and thousands of tokens while waiting for a 3-minute process to finish.

## Solution

The **recall pattern**: the MCP server absorbs the wait internally, then tells the agent to call back.

```
Agent calls tool(wait=True)
  └── Server polls internally (every 15s, up to 60s window)
      ├── Resolved? → return definitive result
      └── Still pending? → return {recall: true, recall_advisory: "..."}
                              └── Agent calls tool(wait=True) again
                                  └── Server polls another 60s window
                                      └── ...repeat until resolved
```

### Properties

- **Server-side pacing**: The server does `time.sleep()`, not the agent. The agent can't sleep.
- **Bounded windows**: Each call blocks for at most 60 seconds. No hangs.
- **Recall signal**: `recall: true` + `recall_advisory` tells the agent to call again without guessing.
- **Definitive returns**: If the result is resolved (success or failure), return immediately — don't burn remaining window time.
- **3-5 calls, not 15+**: A 3-minute CI run takes ~3 calls with real pauses, instead of 15+ instant polls.

## Implementation (Python)

```python
import time

def poll_until_or_recall(
    poll_fn,           # () -> dict — must include "resolved" bool
    window: int = 60,  # max seconds per call
    interval: int = 15 # seconds between polls
) -> dict:
    """Block up to `window` seconds polling `poll_fn` every `interval`.
    
    Returns the result when resolved, or {recall: True} if window expires.
    """
    deadline = time.time() + window
    
    while True:
        result = poll_fn()
        if result.get("resolved"):
            return result
        
        if time.time() >= deadline:
            result["recall"] = True
            result["recall_advisory"] = (
                f"Not yet resolved after {window}s. "
                "Call this tool again to continue waiting."
            )
            return result
        
        time.sleep(interval)
```

## Usage in a tool

```python
@mcp.tool()
def check_ci(repo: str, pr_number: int, wait: bool = False) -> dict:
    """Check CI. With wait=True, blocks up to 60s then returns recall if needed."""
    
    def poll():
        checks = get_checks(repo, pr_number)
        classified = classify(checks)
        classified["resolved"] = classified["all_green"] or classified["failed"]
        return classified
    
    if not wait:
        return poll()
    
    return poll_until_or_recall(poll)
```

## When to use

Any MCP tool that waits on an external process:

| Domain | Tool | What it waits for |
|--------|------|-------------------|
| CI | `check_ci` | GitHub Actions checks |
| Deploy | `check_deploy` | Railway/Vercel build + deploy |
| Migration | `check_migration` | Database migration completion |
| Pipeline | `check_pipeline` | Data extraction/transformation |
| Build | `check_build` | Next.js/webpack production build |

## When NOT to use

- Tools that return instantly (CRUD, queries, lookups)
- Tools where the caller needs real-time progress (use streaming/SSE instead)
- Tools with unpredictable completion time >10 minutes (use webhooks or background jobs)

## Origin

Invented during Greenmark session 33 (2026-04-22). An agent rapid-fire polled `check_ci` 15+ times waiting for a 3-minute CI run. Daniel: "you don't sleep." The fix: make the server absorb the wait, return `recall` when it needs more time.
