# A repo instead of a gist

The first userscript was going to be published as a gist so that the userscript
manager could auto-update it. It lives in this repository instead, and
Violentmonkey updates from the raw file URL on `main`. One source, real version
history, and the debug probes, design notes and measured facts kept next to the
code, so that the next time Google changes how Docs renders there is a snapshot
to start debugging from.

## Considered options

- **A gist.** Rejected: one file per script, with no room for the probes and
  docs, which are the reason to keep this at all.
- **A repo plus a mirrored gist.** Rejected: every change published in two places.
