# Probes for gdocs-find-helpers

Console scripts that measured how Google Docs behaves, in Firefox 145 on Linux,
November 2026. When Docs changes and the userscript breaks, rerun the relevant
probe first: it tells you which assumption moved. The findings are written up in
`docs/reference/gdocs-dom-facts.md` and `docs/traps/`.

## How to run one

1. Open a Google Doc you own (a throwaway copy is best) and open the devtools
   console on the top-level page, not inside an iframe.
2. Most files are a single arrow function. Paste it wrapped in a call:
   `(<paste the file here>)()`. Async ones return a promise; the console shows
   the resolved value, usually a JSON string.
3. `proto/` scripts need the helpers first: run `proto/00-lib.js` once, which
   installs `window.__gp`.
4. Reload the tab afterwards. Several probes leave listeners, observers or
   `window.__*` globals behind. None of them edits the document.

Coordinates such as `(1292, 358)` and words such as `my_example_word` belong to
the original test layout. Change them to a word on your own screen. Files named
`*.tmpl.js` are templates with `__WORD__`-style slots; the files next to them are
filled-in copies.

## Selection and page structure (`probe-*.js`)

| file | tests |
|---|---|
| `probe-0-baseline.js` | editor, text-event iframe and canvas tiles exist; baseline state |
| `probe-1-iframe-dump.js` | what the contenteditable inside `iframe.docs-texteventtarget-iframe` holds |
| `probe-1c-annotate.js`, `probe-1c2-annotate-usage.js` | searches Docs' own JS for the canvas annotation flag and how it is read |
| `probe-2-after-dblclick.js` | after a real double-click: selected text in the mirror, iframe selection, event log |
| `probe-3-overlay.js` | whether the selection is drawn as DOM rects (it is not) |
| `probe-3b-bubble-cursor.js` | the caret and inline bubble positions as a proxy for the selection on screen |
| `probe-3-find-open.js`, `probe-3-find-state.js` | opening Docs' find bar with a synthetic Ctrl+F, and its state |
| `probe-4-find-set.js` | setting the find query from script with the bar open |
| `probe-4c-find-closed.js`, `probe-4d-state-after-close.js` | setting the query with the bar closed; what the closed bar looks like in the DOM |
| `probe-4e-reopen.js`, `probe-4f-close.js` | reopening restores the last query; closing with Escape |
| `probe-4-copy.js`, `probe-4b-copy-in-dblclick.js` | programmatic copy outside and inside a user gesture |
| `probe-5-listeners.js` | which targets receive the trusted `dblclick` (installs logging listeners) |
| `probe-6-arialive.js` | the screen-reader live regions |

## Hidden find bar prototype (`proto/`)

| file | tests |
|---|---|
| `00-lib.js` | installs the `window.__gp` helpers every other proto script uses |
| `01-synthetic-dblclick.js` | makes a selection with a synthetic mouse sequence |
| `02-hidden-open-*.js` | opens the bar hidden by opacity, transform, a hidden ancestor, or not hidden; measures counter, green pixels, flash frames, focus |
| `03-close-esc.js`, `04-close-button.js`, `09-close-clear-esc.js` | where the selection lands after each way of closing |
| `05-fb-*.js` | full `findBriefly` runs with each close mode and a flash sampler |
| `06-cm-*.js` | which occurrence becomes the current match, and where Escape moves the selection |
| `07-prefill-*.js` | Cmd/Ctrl+F prefill timing: set at once versus after the bar is visible |
| `08-single-click.js` | when a single click collapses the selection, and which event shows it |
| `10-fb-green-during-hold.js` | green pixels during and after a `findBriefly` hold |
| `99-cleanup.js` | collapses the selection and checks nothing is left behind |
| `find-briefly.js` | the standalone `findBriefly(word, opts)` prototype; paste it, then call it |
