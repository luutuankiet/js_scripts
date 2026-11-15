# js_scripts

Public userscripts, templates and JavaScript snippets. Userscripts install in
Violentmonkey from their raw GitHub URL and auto-update from it. First resident:
`gdocs-find-helpers` (find-match ticks on the Google Docs scrollbar, double-click
highlighting, Cmd/Ctrl+F selection prefill). Docs draws text on canvas, so it
reads pixels and steers Docs' own find bar.

## Hard constraints

- **Public repo.** No work context: no document titles, doc IDs or URLs, words
  from a real document, hostnames, home paths or tool names; use placeholders
  (`example doc`, `my_example_word`). The only personal detail allowed is the
  author's email `kietluu.it@gmail.com`.
- **Bump `@version` on every `.user.js` change.** Installs update from
  `https://raw.githubusercontent.com/luutuankiet/js_scripts/main/<path>` only
  when the version rises; an unbumped change reaches nobody.
- **One folder per script**: `userscripts/<name>/<name>.user.js` plus
  `probes/`, the console scripts that measured the page. When the page changes,
  rerun the probes before touching the script.
- **Date page facts.** Selectors, colours, timings: "measured <month year>" and
  the browser.

## Layout

```
README.md                         front page, one row per script + install link
userscripts/gdocs-find-helpers/   one folder per userscript
  gdocs-find-helpers.user.js      the script (raw URL = install/update link)
  probes/                         console probes, with a README
docs/{architecture,traps,reference,adr}/   see below
scripts/gen-docs-index.sh         regenerates docs/README.md and index skills
```

## Adding a script

Create `userscripts/<name>/<name>.user.js` with `@version`, `@author`,
`@downloadURL` and `@updateURL` (the raw URL); add scrubbed probes with a README,
a `README.md` row and a `docs/architecture/` page; run `scripts/gen-docs-index.sh`.

## Checks

No build, no test runner. `node --check <file>.js` for syntax;
`scripts/gen-docs-index.sh --check` exits 1 if the index is stale; behaviour is
checked by hand in the browser.

<!-- Standard block. Everything above belongs to this project; everything below is
     the pointer every repo laid out this way carries. -->

## Documentation

Indexed in [docs/README.md](docs/README.md). Every page is self-contained: it
assumes you opened that one file and have nothing else loaded.

| where | what | read it |
|---|---|---|
| [architecture/](docs/architecture/) | where behaviour lives, one page per area | before going looking for something |
| [traps/](docs/traps/) | failure modes with no error message, indexed by symptom | before debugging something wrong but not crashing |
| [reference/](docs/reference/) | simply true, expensive to re-derive | when you need the detail |
| [adr/](docs/adr/) | why the repo is the way it is | before changing something that looks odd |

## Before you wrap up

Leave the repo holding what this session cost you to find out. Four rules.

1. **Sort it, and expect most of it to go nowhere.** A next action is an issue. A
   durable, expensive-to-re-derive fact is a page. A choice that was hard to
   reverse, surprising without context and a real trade-off is a decision record
   under `docs/adr/`. Status, dates, version pins and plans are none of those;
   delete them.
2. **A doc is the last resort.** Type error → test → comment at the site → doc.
   Name the single line you would have commented instead; if you can name it,
   comment it and stop.
3. **Verify against running code before writing, and date the page `verified:`.**
   Anything remembered from earlier in the session is stale until re-read. Deleting
   a draft because the problem is already fixed is a success.
4. **Append, never rewrite.** Supersede a merged decision record with a new one
   naming what it replaces. A trap filename is an identifier quoted elsewhere:
   edit the body, never the name.

Then run `scripts/gen-docs-index.sh`. Never hand-maintain an index.
