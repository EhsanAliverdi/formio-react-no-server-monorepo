---
name: compact-handoff
description: Use when the conversation is long, context is near its limit, the user asks to save tokens, compact, start fresh, switch tasks, or preserve state before clearing context. Creates a concise handoff note so the next Claude Code session can resume without reloading the full conversation.
---

# Compact Handoff

Preserve current state in a small handoff file before compaction or task switching.

## When To Use

Use at natural boundaries:

- Before `/compact`, `/clear`, or starting a new Claude Code session.
- After finishing a feature or debugging pass.
- Before switching to an unrelated task.
- When the session has accumulated many file reads, logs, or exploratory branches.

Do not interrupt active implementation if the next step depends on details still in context.

## Handoff File

Write or update `.claude/context-handoff.md` with this structure:

```markdown
# Context Handoff

## Current Task
[One or two sentences.]

## Repo State
- Branch:
- Important uncommitted changes:
- User-owned changes to preserve:

## Relevant Files
- `path`: why it matters

## Decisions
- Decision and reason

## Verification
- Command: result

## Next Steps
- The next concrete action
```

Keep the file short. Prefer paths, symbols, and decisions over pasted code.

## After Writing

Tell the user:

- The handoff file was updated.
- They can run `/compact`, `/clear`, or start a new session.
- In the next session, they should ask Claude to read `.claude/context-handoff.md` first.

