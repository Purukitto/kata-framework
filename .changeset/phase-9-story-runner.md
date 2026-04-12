---
"@kata-framework/test-utils": minor
---

Add `StoryTestRunner` — behavioral test harness that lets you drive narratives by player intent (`advanceUntilChoice`, `advanceUntilText`, `choose(label)`) rather than tracking frame indices. Includes `dialogueLog`, `speakerLog`, `currentChoices`, `ctx`, and `canReach()` for static graph reachability. Throws with available labels when `choose()` can't find a match.
