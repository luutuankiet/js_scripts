---
title: Google Docs DOM facts, selectors, colours and timings
summary: the selectors, find-highlight colours and timings gdocs-find-helpers depends on, each measured in Firefox 145 on Linux (macOS where marked), November 2026
verified: 2026-11-15
---

# Google Docs DOM facts

Every value here is measured, not documented by Google, and will drift. All were
measured in Firefox 145.0 on Linux x86_64, `devicePixelRatio` 1, viewport
2304x1072, in November 2026, with the probes in
`userscripts/gdocs-find-helpers/probes/`. Rows marked macOS were measured in
Firefox on macOS in the same month.

## Selectors

| what | selector | measured |
|---|---|---|
| scroller | `.kix-appview-editor` | Nov 2026 |
| text canvas tiles | `canvas.kix-canvas-tile-content` (skip tiles with zero size or `offsetHeight`) | Nov 2026 |
| page backgrounds | `.kix-page-paginated` | Nov 2026 |
| page-number label shown while scrolling | `.kix-scrollbarwidget` | Nov 2026 |
| selection mirror | `iframe.docs-texteventtarget-iframe` then `[contenteditable]`, read `textContent`; on macOS empty until a copy event | Nov 2026 |
| find card | `.appsDocsUiWizFindbarCard`, open when computed `visibility` is `visible` | Nov 2026 |
| find input | `input[aria-label="Find in document"]` | Nov 2026 |
| find counter | `.appsDocsUiWizFindbarFindInputCounter`, text like `6 of 271`, counts all document tabs | Nov 2026 |
| find close button | `button[aria-label="Close"]` inside the card | Nov 2026 |
| caret | `.kix-cursor`, `transform: translate(x, y)`; hidden while a range is selected | Nov 2026 |
| inline bubble near the selection end | `.inlineFabBubbleContainer` | Nov 2026 |
| canvas annotation flag (not live-tested) | `window._docs_annotate_canvas_by_ext`, read once at load, needs `@run-at document-start` | Nov 2026 |

## Colours

| what | value | measured |
|---|---|---|
| current find match | `rgb(109, 213, 140)` | Nov 2026 |
| other find matches | `rgb(196, 238, 208)` | Nov 2026 |
| tolerance used | 7 per channel, sampling 1 pixel per 3x2 CSS px, 2 pixels per row | Nov 2026 |

## Layering

| what | z-index | measured |
|---|---|---|
| Docs' text layer | 22 | Nov 2026 |
| Docs' find bar | 1003 | Nov 2026 |

## Timings

| step | time | measured |
|---|---|---|
| Ctrl+F to card visible | 50 to 180 ms | Nov 2026 |
| Docs overwrites an early prefill with the last query | about 65 ms after Ctrl+F | Nov 2026 |
| `input` event to green painted | 24 to 31 ms (hidden ancestor: 102 ms) | Nov 2026 |
| `input` event to counter updated | 27 to 57 ms | Nov 2026 |
| hidden open, fill to counter, close | about 55 ms, 70 to 120 ms, 25 to 90 ms | Nov 2026 |
| repaint after scroll | 2 animation frames | Nov 2026 |
| single click empties the mirror | about 1 ms after mouseup; iframe `selectionchange` about 6 ms | Nov 2026 |
| find counter updates before the green is painted (fresh query) | reading at once missed every match above the current one | Nov 2026 |
| hidden second editor (iframe of the same doc) to ready | about 2 s; about 3.5 s of main-thread stalls in bursts, worst 612 ms | Nov 2026 |
| hidden second editor memory | about +120 MB at peak, settles to about +12 MB | Nov 2026 |

## Events

| fact | measured |
|---|---|
| synthetic Ctrl+F `keydown` on the iframe contenteditable opens Docs' bar (`defaultPrevented: true`) | Nov 2026 |
| synthetic Escape `keydown` on the find input closes the bar | Nov 2026 |
| trusted `dblclick` reaches `window`, `document` and `.kix-appview-editor` with `clientX/clientY`; inside the iframe only `selectionchange` fires | Nov 2026 |
| `execCommand('copy')` works only inside a user gesture, and overwrites the clipboard | Nov 2026 |
| reopening the bar restores the last query; Docs never prefills it with the selection | Nov 2026 |
| macOS: Docs opens its bar on Cmd+F only; a synthetic Ctrl+F does nothing | Nov 2026 |
| a synthetic `ClipboardEvent('copy')` with a new `DataTransfer` on the contenteditable: Docs writes the selection into its `clipboardData` and fills the mirror; the system clipboard is untouched (Linux and macOS) | Nov 2026 |
| two editor sessions of one doc in one tab do not share the find query | Nov 2026 |
