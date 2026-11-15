# Scan a hidden second editor, never the visible one

Docs paints only the canvas near the viewport, so reading every find match in a
tab means scrolling an editor through the whole tab. Up to v0.4 the script
scrolled the editor you were reading and laid a frozen picture of the page over
it. From v0.5 it loads the same document once more in a hidden, `inert`,
same-origin iframe and scrolls that editor instead. The editor you see never
scrolls for a scan.

## Considered options

- **Sweep the visible editor behind a frozen picture (v0.4).** Rejected: the
  picture covers the text, but not everything Docs moves when the editor
  scrolls. The outline sidebar highlight walked through the headings, and the
  page flashed when the picture came off. Hiding every such side effect means
  chasing Docs' UI one element at a time.
- **Read only what is painted.** Rejected as the main path: ticks for the
  visible stretch only. It is kept as the fallback while the hidden editor
  loads.
- **A hidden second editor.** Chosen. Its rows map 1:1 onto the visible editor
  when both scrollers have the same width (measured November 2026, Firefox: 51
  of 54 rows exact, 53 within 2 px). Docs does not share the find query between
  the two editor sessions, so the hidden search never shows up in your find box.

## Consequences

- **Load cost.** The second editor blocks the page for about 3.5 s in bursts
  while it loads (worst gap 612 ms) and adds about 120 MB at peak, settling to
  about 12 MB (measured November 2026, Firefox). It is loaded on the first
  double-click or find, not at page open, so documents you only read never pay.
  That first scan shows ticks for the painted stretch only.
- **One load per document tab.** The iframe is keyed on the URL without the
  `#` part; moving to another document tab loads a new one.
- **A second session signed in as you.** Collaborators may see you twice. Not
  checked with a second account.
- **The userscript runs inside the iframe too.** The `window.top !== window`
  guard at the top of the script stops that copy.
- **Positions come from the hidden editor only.** Rows read off the visible
  editor while Docs is still scrolling can land up to 80 px off, so only "which
  match is current" is taken from the visible editor.
