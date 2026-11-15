# Keep the hidden find bar open after a double-click

Replaces the last sentence of `0002-use-docs-own-find-highlighting.md` ("The
green highlights leave with the bar; only the scrollbar ticks remain").

Docs only paints its green find highlights while its find bar is open. Up to
v0.4 the double-click flow closed the hidden bar as soon as the ticks were read,
so the green vanished and only the ticks stayed. From v0.5 the bar stays open,
still hidden, for as long as the double-clicked word stays selected.

## Considered options

- **Close at once (v0.4).** Rejected: you lose the highlights, which are the
  point of a double-click highlighter.
- **Paint our own highlights.** Rejected for the reason in 0002: it needs the
  position of every word on the canvas.
- **Leave the hidden bar open.** Chosen.

## Consequences

- **Something must close it.** The bar is closed, always by emptying the box
  first and then Escape, when the selection changes or collapses, on the next
  double-click, or when Docs closes it itself. A poll checks the selection
  because on macOS the selection mirror gives no signal of its own (see the
  architecture page).
- **Cmd/Ctrl+F hands it over.** Pressing the find key while the green shows
  removes the hiding style, so the bar you see is the one already holding the
  word.
