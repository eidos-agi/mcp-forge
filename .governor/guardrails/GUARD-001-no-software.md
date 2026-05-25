---
id: "GUARD-001"
type: "guardrail"
title: "No software — skills and templates only"
status: "active"
date: "2026-04-22"
---

## Rule

mcp-forge must never become a Python package, a TypeScript package, a CLI tool, or any installable software. It is a collection of Claude Code skills (`.claude/skills/*.md`) and file templates (`templates/*`). Nothing more.

## Why

Software requires maintenance. Skills are just knowledge — they evolve with the agent and never break. The moment mcp-forge becomes a package, it:

- Has to pass its own standards (and would be embarrassed by its own audits)
- Creates circular dependencies (every MCP server would depend on the forge that scaffolds MCP servers)
- Needs versioning, release pipelines, semver discipline
- Becomes another thing that can rot

The whole point of a forge is that the knowledge is portable and free of runtime weight. A scaffold copied from `templates/server-ts.ts` lives in the target project forever, with zero ongoing dependency on mcp-forge.

## Violation Examples

- Adding a `pyproject.toml` with a build system
- Adding a `package.json` with `dependencies` (the templates have a package.json with deps — that's the *scaffold being generated*, not mcp-forge itself packaging software)
- Writing a CLI entry point (`mcp-forge init` invoked as a shell command, distinct from `/mcp-forge-init` invoked as a Claude Code skill)
- Publishing mcp-forge to PyPI or npm
- Adding a `bin/` directory or a `Makefile` that runs anything other than tests/lint against the templates themselves
- Importing `mcp-forge` from another project

## Exceptions

None. If you think you need an exception, you actually need a different tool:
- Need to programmatically scaffold? Write a shell script in the *target* project that uses the templates.
- Need to lint MCP servers across the fleet? That's a separate repo (call it `mcp-audit` or similar), not mcp-forge.
