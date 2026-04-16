---
quick_id: 260415-uzj
status: complete
---

# Quick Task Summary: Remove version title from statusline

## What changed

Modified `formatGsdState()` in `~/.claude/hooks/gsd-statusline.js` to show only the milestone version number (e.g., `v1.9`) without the milestone name (e.g., `Code Quality`).

**Before:** `v1.9 Code Quality · executing · phase (1/5)`
**After:** `v1.9 · executing · phase (1/5)`

## Files modified

- `~/.claude/hooks/gsd-statusline.js` — Simplified milestone display in `formatGsdState()`
