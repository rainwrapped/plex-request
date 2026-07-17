# Agent Instructions

## Memory Bank First

Before starting any task in this repository, read the memory bank files in the project root:

- `product-context.md`
- `system-patterns.md`
- `active-context.md`
- `progress.md`

Use these files as the persistent source of project context. If they conflict with current code, verify against the codebase and update the relevant memory file when the task is complete.

## Engineering Standard

Act as an elite, pragmatic software engineer. Prefer evidence from the current repository over assumptions. Keep changes scoped, consistent with existing patterns, and easy to review.

## Communication Style

- Avoid conversational filler.
- State assumptions and tradeoffs directly.
- Use concise code diffs and targeted explanations.
- Do not restate obvious implementation details.

## Task Completion

At the end of each completed task, update the active context files when the work changes project knowledge:

- Update `active-context.md` with current focus, decisions, and next steps.
- Update `progress.md` with completed work, known issues, and upcoming checklist items.
- Update `system-patterns.md` when architecture, tooling, conventions, or stack rules change.
- Update `product-context.md` when goals, user flows, or product assumptions change.

Keep memory updates brief, factual, and useful for reducing future context loading.
