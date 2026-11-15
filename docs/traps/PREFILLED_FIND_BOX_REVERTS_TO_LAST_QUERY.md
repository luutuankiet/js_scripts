---
symptom: "Cmd+F prefill with the selection is replaced by the previous search a moment later"
area: gdocs-find-helpers
verified: 2026-11-15
---

# A Cmd/Ctrl+F prefill set too early is overwritten

**Symptom.** A keydown handler for Cmd/Ctrl+F writes the selected text into the
find input. For a split second it is there, then the box shows the previous
search instead.

**Mechanism.** Opening the bar is asynchronous. Docs restores its last query
into the input as part of opening, after your handler has run. Measured in
Firefox 145, November 2026: a value set in the capture handler at t = 8 ms was
overwritten with the last query at t = 65 ms. A value set once the card was
visible, at t = 182 ms, stayed, `select()` held, and the counter showed
`1 of 31` at t = 280 ms with no change up to t = 1505 ms. From Ctrl+F to the card
being visible took 50 to 180 ms. Opening also re-runs the last query, so the
counter changes once before your text is filled in.

**Fix.** Let Docs open the bar, poll each frame until the computed `visibility`
of `.appsDocsUiWizFindbarCard` is `visible`, then set the value, dispatch
`input` and call `select()` so typing replaces it.

**Verify.** `probes/proto/07-prefill-nowait.js` (overwritten) against
`probes/proto/07-prefill-delay0.js` (kept).

**General rule.** When writing into another app's control, wait for the app to
finish its own initialisation of that control, or it will undo yours.
