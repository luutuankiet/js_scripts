---
symptom: "find bar is closed but the input still exists, offsetParent is not null and value still has the old query"
area: gdocs-find-helpers
verified: 2026-11-15
---

# The closed find bar still looks open from the DOM

**Symptom.** After the user closes Docs' find bar, code that checks
`document.querySelector('input[aria-label="Find in document"]')`,
`input.offsetParent` or `input.value` still sees a bar with a query. Ticks keep
showing after the bar is gone (the v0.3 behaviour).

**Mechanism.** Docs does not remove the card on close. `.appsDocsUiWizFindbarCard`
stays in the DOM with `display: flex` and `visibility: hidden`, so
`offsetParent` stays non-null, and the input keeps the last query as its value.
Measured in Firefox 145, November 2026 (`probes/probe-4d-state-after-close.js`).

**Fix.** Treat the bar as open only when
`getComputedStyle(card).visibility === 'visible'`. Note that if you hide the bar
yourself by setting `visibility: hidden` on an ancestor, this test also reads
"closed"; hide with `opacity` and a transform instead.

**Verify.** Open the bar, search, close it, then run `probe-4d-state-after-close.js`:
the card is present, `visibility` is `hidden`, and the input value is the old query.

**General rule.** In a single-page app, a closed panel is often only hidden.
Test visibility through computed style, not presence.
