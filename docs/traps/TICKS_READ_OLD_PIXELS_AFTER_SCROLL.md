---
symptom: "ticks are missing or in the wrong place after the sweep scrolls; tiles read right after scrolling show the previous content"
area: gdocs-find-helpers
verified: 2026-11-15
---

# Canvas tiles need two frames to repaint after a scroll

**Symptom.** A sweep sets `scrollTop` and reads the canvas tiles straight away
or after one animation frame. Ticks come out duplicated, shifted or missing,
because the pixels read belong to the previous position.

**Mechanism.** Setting `scrollTop` and dispatching a `scroll` event makes Docs
move its tiles at once, but it repaints them later. After one frame the tiles
still hold the old pixels; after two they are current. This comes from the v0.3
script, whose comment reads: "Docs moves its tiles right away... and has
repainted them two frames later. One frame is too early: the tiles still hold old
pixels." Background tabs get no animation frames, so each wait also has a
150 ms timeout.

**Fix.** After each scroll step: `sc.dispatchEvent(new Event('scroll'))`, then
`await frame(); await frame();` before reading. This is the main cost of a
sweep: two frames per stop.

**Verify.** Change the sweep to one frame and compare tick positions with the
green highlights on screen: they disagree.

**General rule.** After driving another app's renderer, wait for its paint, not
just its layout.
