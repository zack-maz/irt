---
quick_id: 260415-uzj
description: 'In our status line, keep the version number but remove the version title'
task_count: 1
---

# Quick Plan: Remove version title from statusline

## Task 1: Remove milestoneName from formatGsdState output

**File:** `~/.claude/hooks/gsd-statusline.js`
**Action:** In `formatGsdState()`, change the milestone section to only push `s.milestone` (version number) without appending `s.milestoneName` (version title).
**Verify:** The statusline shows `v1.9 · executing · phase (1/5)` instead of `v1.9 Code Quality · executing · phase (1/5)`
**Done:** Version number preserved, version title removed.
