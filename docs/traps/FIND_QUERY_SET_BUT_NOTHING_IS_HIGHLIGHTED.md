---
symptom: "setting the find input value from script does nothing: counter stale, no green highlights, yet input.value shows the new text"
area: gdocs-find-helpers
verified: 2026-11-15
---

# Setting the find query does nothing while the bar is closed

**Symptom.** A script sets the find input's value and dispatches `input`. No
matches are painted, the `"N of M"` counter does not change, but reading
`input.value` back returns the new text, so the script believes it worked.

**Mechanism.** Docs only runs the search while its find bar is open. The closed
bar stays in the DOM (see the trap on the closed bar), so the input accepts a
value, but nothing listens. With the bar open the same native setter plus
`input` event runs the search, paints the matches and updates
`.appsDocsUiWizFindbarFindInputCounter` (for example `"6 of 271"`). Measured in
Firefox 145, November 2026 (`probes/probe-4-find-set.js`,
`probes/probe-4c-find-closed.js`).

**Fix.** Open the bar first: dispatch a synthetic Ctrl+F `keydown` (Cmd+F on
macOS, where Docs ignores Ctrl+F) on the
contenteditable inside `iframe.docs-texteventtarget-iframe`, wait until the card's
computed `visibility` is `visible`, then set the value. To do this without a
visible bar, hide the card with `opacity: 0` and an off-screen transform; the
search still runs. A search with no bar open at all is not possible.

**Verify.** With the bar closed, set a value and watch the counter: unchanged.
Open it and repeat: green appears within about 30 ms.

**General rule.** An input that accepts a value is not proof that anything is
listening to it; check the effect, not the field.
