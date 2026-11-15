# Use Docs' own find highlighting for double-click

Double-clicking a word should mark every occurrence, as the Selection Highlighter
browser add-on does on ordinary pages. The script drives Docs' own find bar,
opened invisibly, and reads the green highlight pixels Docs paints, instead of
bridging to that add-on.

## Considered options

- **Bridge to the Selection Highlighter add-on.** Rejected: it has no message API
  for another script to call, and it finds words by walking DOM text nodes with a
  `TreeWalker`. Google Docs draws its text on canvas, so there are no text nodes
  to walk.
- **Draw our own highlight overlay.** Rejected: it would need the position of
  every word, which means re-implementing Docs' search and text layout from
  canvas pixels. Docs' find already knows both.

## Consequences

Docs only searches while its bar is open, so the bar has to be opened, hidden and
closed around every double-click, and closing it safely needs the input emptied
first. The green highlights leave with the bar; only the scrollbar ticks remain.
