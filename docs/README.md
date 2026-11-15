# Documentation

Every page here is written for a maintainer six months from now who opened
exactly this file from a search result and has nothing else loaded.

This index is generated. Run `scripts/gen-docs-index.sh` after adding or
renaming a page; `--check` fails if it is stale.

<!-- BEGIN GENERATED INDEX -- edit the pages, not this block -->

## Where things live

One page per area of the system. Read before going looking for where
something is implemented.

| page | covers | verified |
|---|---|---|
| [gdocs-find-helpers, the Google Docs find userscript](architecture/gdocs-find-helpers.md) | how the scrollbar ticks are found, how the double-click highlight and Cmd/Ctrl+F prefill drive Docs' find bar, where the selected text is read from | 2026-11-15 |

## Traps

Failure modes that produce no error message, indexed by the symptom you
would observe. Read before debugging behaviour that is wrong but not
crashing.

| symptom | page | area | verified |
|---|---|---|---|
| the current find match is a different occurrence from the word I selected, even when searching the selected word | [CURRENT_MATCH_IS_NOT_THE_ONE_AT_THE_CURSOR](traps/CURRENT_MATCH_IS_NOT_THE_ONE_AT_THE_CURSOR.md) | gdocs-find-helpers | 2026-11-15 |
| find bar is closed but the input still exists, offsetParent is not null and value still has the old query | [FIND_BAR_LOOKS_OPEN_AFTER_IT_IS_CLOSED](traps/FIND_BAR_LOOKS_OPEN_AFTER_IT_IS_CLOSED.md) | gdocs-find-helpers | 2026-11-15 |
| setting the find input value from script does nothing: counter stale, no green highlights, yet input.value shows the new text | [FIND_QUERY_SET_BUT_NOTHING_IS_HIGHLIGHTED](traps/FIND_QUERY_SET_BUT_NOTHING_IS_HIGHLIGHTED.md) | gdocs-find-helpers | 2026-11-15 |
| Cmd+F prefill with the selection is replaced by the previous search a moment later | [PREFILLED_FIND_BOX_REVERTS_TO_LAST_QUERY](traps/PREFILLED_FIND_BOX_REVERTS_TO_LAST_QUERY.md) | gdocs-find-helpers | 2026-11-15 |
| after closing the find bar with Escape or the Close button the selection jumps to another occurrence of the word | [SELECTION_JUMPS_AFTER_CLOSING_FIND](traps/SELECTION_JUMPS_AFTER_CLOSING_FIND.md) | gdocs-find-helpers | 2026-11-15 |
| ticks are missing or in the wrong place after the sweep scrolls; tiles read right after scrolling show the previous content | [TICKS_READ_OLD_PIXELS_AFTER_SCROLL](traps/TICKS_READ_OLD_PIXELS_AFTER_SCROLL.md) | gdocs-find-helpers | 2026-11-15 |

## Reference

Simply true, and expensive to re-derive.

| page | summary | verified |
|---|---|---|
| [Google Docs DOM facts, selectors, colours and timings](reference/gdocs-dom-facts.md) | the selectors, find-highlight colours and timings gdocs-find-helpers depends on, each measured in Firefox 145 on Linux, November 2026 | 2026-11-15 |

## Decisions

Why the repo is the way it is. A merged decision is immutable -- supersede
it with a new one rather than editing it.

- [A repo instead of a gist](adr/0001-a-repo-instead-of-a-gist.md)
- [Use Docs' own find highlighting for double-click](adr/0002-use-docs-own-find-highlighting.md)

<!-- END GENERATED INDEX -->
