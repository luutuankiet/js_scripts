---
symptom: "the current find match is a different occurrence from the word I selected, even when searching the selected word"
area: gdocs-find-helpers
verified: 2026-11-15
---

# The current match is not the occurrence at the cursor

**Symptom.** You search for the selected word, expecting Docs to make that
occurrence current. The darker green current match, and the `"N of M"` counter,
point at another copy.

**Mechanism.** Measured in Firefox 145, November 2026, with a selection spanning
about x 1222 to 1372:

- With no previous query, the current match was the first match after the
  selection (x 1599).
- After a previous query, it moved forward from the old current match (prior
  match at x 1088, new one at x 1138, before the selection).
- Searching the selected word itself made `1 of 31` current, an earlier
  occurrence at x 1032.

**Fix.** Never rely on the current match to locate the selection. Use the
double-click point as the position, and close the bar only after emptying the
input, so Docs does not move the selection onto the current match.

**Verify.** `probes/proto/06-cm-*.js`, after `00-lib.js`; they report the current
match and the inline bubble position before and after.

**General rule.** "Current" in another app's search means its own cursor through
the results, not yours.
