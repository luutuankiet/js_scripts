---
symptom: "after closing the find bar with Escape or the Close button the selection jumps to another occurrence of the word"
area: gdocs-find-helpers
verified: 2026-11-15
---

# Closing the find bar moves the selection

**Symptom.** A script opens Docs' find bar, searches, and closes it with Escape or
the Close button (`button[aria-label="Close"]`). Afterwards the user's selection is
somewhere else: a different word, or the same word at another place in the
document. The text of the selection can even be identical, so a check on the
selected text passes.

**Mechanism.** On close, Docs selects the current match. The current match is
often not the occurrence the user had selected (see the trap on the current
match). Measured in Firefox 145, November 2026: with `my_example_word` selected,
closing with Escape left `word`, `Example` or `example` selected depending on the
query, and searching the selected word itself moved the selection to an earlier
copy (the inline bubble moved from x 1365 to x 1098 with the same text).

| close | selection after |
|---|---|
| Escape on the input | moves to the current match |
| Close button | moves the same way |
| empty the value, then Escape | unchanged |
| empty the value, then Close button | unchanged |

**Fix.** Empty the input (native setter, then `input` event) before closing. With
no query there is no current match to select. The trade: the next plain
Cmd/Ctrl+F opens an empty box instead of the last query, which is deliberate.

**Verify.** `probes/proto/03-close-esc.js` against `probes/proto/09-close-clear-esc.js`,
each after `00-lib.js` and a selection.

**General rule.** Closing a modal control can have side effects on document
state; measure the state after close, not only the control.
