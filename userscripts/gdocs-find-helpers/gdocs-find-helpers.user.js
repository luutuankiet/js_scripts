// ==UserScript==
// @name         Google Docs – find helpers
// @namespace    luutuankiet.gdocs
// @version      0.5
// @author       kietluu.it@gmail.com
// @description  Double-click a word to mark every match on the scrollbar; Cmd/Ctrl+F fills the find box with your selection; ticks per find match next to the scrollbar.
// @match        https://docs.google.com/document/*
// @run-at       document-idle
// @grant        none
// @homepageURL  https://github.com/luutuankiet/js_scripts
// @updateURL    https://raw.githubusercontent.com/luutuankiet/js_scripts/main/userscripts/gdocs-find-helpers/gdocs-find-helpers.user.js
// @downloadURL  https://raw.githubusercontent.com/luutuankiet/js_scripts/main/userscripts/gdocs-find-helpers/gdocs-find-helpers.user.js
// ==/UserScript==

(() => {
  'use strict';
  if (window.top !== window) return;   // Violentmonkey also runs us inside the shadow editor below
  if (window.__gdocsFindHelpers) return;

  // Colours Docs paints on the canvas for find matches (measured in Firefox, Nov 2026).
  const ACTIVE   = [109, 213, 140];  // current match, darker green
  const INACTIVE = [196, 238, 208];  // other matches, light green
  const TOL = 7;              // per-channel tolerance
  const SX = 3, SY = 2;       // read one pixel per 3x2 CSS px: plenty to spot a highlight, and fast
  const MIN_PX = 2;           // sampled pixels in a row to count as a highlight row
  const MAX_MISS = 1;         // sample rows below MIN_PX tolerated inside one highlight
  const POLL_MS = 100;
  const SETTLE_MS = 200;      // wait this long after the query stops changing before sweeping
  const SWEEP_MAX_MS = 20000; // safety limit only; the double-click flow always sweeps the whole tab
  const SWEEP_MAX_STEPS = 2000;
  const SLACK = 64;           // px of gap tolerated between painted stretches (top padding, page gaps)
  const DBL_WAIT_MS = 300;    // wait for a possible third click before starting
  const PREFILL_MIN_MS = 180; // Docs restores the last query about 65 ms after Ctrl+F; fill after that
  const MAX_SEL = 100;        // longest selection we search for
  const OPEN_TIMEOUT_MS = 4000;  // the first open after a page load builds the bar: 1.7 s measured
  const PAINT_FRAMES = 6;      // frames to wait for the green when the first look finds none

  // Docs only paints the canvas near the viewport, so every match in the tab is read
  // from a hidden second editor (see "the shadow editor"); the visible one never scrolls.

  // mode: '' (no ticks), 'user' (a find you opened yourself), 'dbl' (from a double-click)
  // kept: the hidden find bar left open after a double-click, so Docs' green stays painted.
  const state = { mode: '', rows: [], sweeps: 0, lastSweepMs: 0, lastSteps: 0, flow: null, lastFlow: null, kept: null };
  window.__gdocsFindHelpers = state;   // for debugging from the console

  const [AR, AG, AB] = ACTIVE, [IR, IG, IB] = INACTIVE;
  const G_LO = Math.min(AG, IG) - TOL, G_HI = Math.max(AG, IG) + TOL;
  const card      = () => document.querySelector('.appsDocsUiWizFindbarCard');
  const findInput = () => (card() && card().querySelector('input[type="text"], input:not([type])'))
                          || document.querySelector('input[aria-label="Find in document"]');
  const counterText = () => { const c = document.querySelector('.appsDocsUiWizFindbarFindInputCounter'); return c ? c.textContent : ''; };
  // The card stays in the DOM when closed, with visibility:hidden. That is the only reliable sign.
  const isOpen = () => {
    const c = card() || (findInput() && findInput().closest('.appsDocsUiWizFindbarCard'));
    return !!c && getComputedStyle(c).visibility === 'visible';
  };
  const scroller  = () => document.querySelector('.kix-appview-editor');
  const iframe    = () => document.querySelector('iframe.docs-texteventtarget-iframe');
  const editor    = () => { const f = iframe(); try { return f && f.contentDocument && f.contentDocument.querySelector('[contenteditable]'); } catch { return null; } };
  const IS_MAC    = /Mac|iPhone|iPad/.test(navigator.platform);
  const FIND_MOD  = IS_MAC ? { metaKey: true } : { ctrlKey: true };   // macOS Docs ignores Ctrl+F (measured Nov 2026, Firefox 145)
  const mirror    = () => { const ce = editor(); return ce ? (ce.textContent || '').trim() : ''; };
  // Docs on Linux fills the mirror on every selection change; Docs on macOS leaves it empty
  // until something copies. A synthetic copy event makes Docs write the selection into the
  // event's clipboardData (and fill the mirror) without touching the system clipboard.
  const copiedSel = () => {
    const ce = editor();
    if (!ce) return '';
    let text = '';
    const grab = e => { try { text = e.clipboardData ? e.clipboardData.getData('text/plain') : ''; } catch {} };
    const w = ce.ownerDocument.defaultView;
    w.addEventListener('copy', grab);            // bubble phase: runs after Docs' own handler
    try {
      dispatch(ce, new ClipboardEvent('copy', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true, composed: true }));
    } finally { w.removeEventListener('copy', grab); }
    return text.trim();
  };
  // Cheap read for polling; `deep` falls back to the copy trick when the mirror is empty.
  const selText   = (deep = false) => mirror() || (deep ? copiedSel() : '');
  const usable    = s => !!s && s.length <= MAX_SEL && !/[\r\n\v\f\x85\u2028\u2029]/.test(s);
  const tilesOf   = sc => [...sc.querySelectorAll('canvas.kix-canvas-tile-content')].filter(c => c.width && c.height && c.offsetHeight);   // Docs keeps spare hidden tiles
  const sleep = t => new Promise(r => setTimeout(r, t));
  const frame = () => new Promise(res => {
    let done = false;
    const f = () => { if (!done) { done = true; res(); } };
    requestAnimationFrame(f);
    setTimeout(f, 150);              // background tabs get no animation frames
  });
  const waitFor = async (fn, timeout, stop) => {
    const t = performance.now();
    while (performance.now() - t < timeout) {
      if (stop && stop()) return false;
      if (fn()) return true;
      await frame();
    }
    return !!fn();
  };

  // Events this script dispatches itself must not count as "the user pressed a key".
  let selfDispatch = 0;
  const dispatch = (target, ev) => { selfDispatch++; try { target.dispatchEvent(ev); } finally { selfDispatch--; } };
  const setValue = (input, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, v);
    dispatch(input, new Event('input', { bubbles: true }));
  };
  const key = (target, k, extra = {}) => {
    const kc = k === 'Escape' ? 27 : k.toUpperCase().charCodeAt(0);
    dispatch(target, new KeyboardEvent('keydown', Object.assign({
      key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, keyCode: kc, which: kc,
      bubbles: true, cancelable: true, composed: true,
    }, extra)));
  };
  const hideStyle = () => {
    const s = document.createElement('style');
    s.textContent = '.appsDocsUiWizFindbarCard{opacity:0!important;transform:translate(-100000px,-100000px)!important;transition:none!important;pointer-events:none!important}';
    document.documentElement.appendChild(s);
    return s;
  };

  // ---- tick strip ---------------------------------------------------------
  const track = document.createElement('div');
  track.id = 'gdocs-find-helpers-ticks';
  Object.assign(track.style, {
    position: 'fixed', width: '10px', zIndex: 2147483000,
    pointerEvents: 'none', display: 'none',
  });
  document.documentElement.appendChild(track);

  function setRows(rows, mode) { state.rows = rows; state.mode = rows.length || mode === 'user' ? mode : ''; }
  function clearTicks() { state.rows = []; state.mode = ''; track.style.display = 'none'; track.replaceChildren(); }

  function draw(sc) {
    if (!sc) return;
    const r = sc.getBoundingClientRect();
    Object.assign(track.style, {
      display: state.rows.length ? 'block' : 'none',
      top: r.top + 'px', height: sc.clientHeight + 'px', left: (r.right - 12) + 'px',
    });
    track.replaceChildren(...state.rows.map(h => {
      const t = document.createElement('div');
      const pct = Math.min(100, (h.y / sc.scrollHeight) * 100);
      Object.assign(t.style, {
        position: 'absolute', left: 0, right: 0, top: `calc(${pct}% - 1px)`,
        height: h.active ? '4px' : '3px', borderRadius: '1px',
        background: h.active ? '#1e8e3e' : '#f9ab00',
        pointerEvents: 'auto', cursor: 'pointer',
      });
      t.title = 'Jump to match';
      t.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();          // a tick is not a click in the document
        sc.scrollTop = h.y - sc.clientHeight / 3;
      });
      return t;
    }));
  }

  // ---- read the painted tiles --------------------------------------------
  const scratch = document.createElement('canvas');
  const sctx = scratch.getContext('2d', { willReadFrequently: true });

  // One entry per tile: the stretch of the document it covers and the highlight rows in it.
  // `seen` (sweep only) holds the tiles already read; those come back with rows = null.
  function scan(sc, seen) {
    const sr = sc.getBoundingClientRect();
    return tilesOf(sc).map(c => {
      const cr = c.getBoundingClientRect();
      const from = cr.top - sr.top + sc.scrollTop;        // tile top in scroll coordinates
      const part = { from, to: from + cr.height, rows: null };
      const k = Math.round(from);
      if (seen && seen.has(k)) return part;
      const w = Math.max(1, Math.round(cr.width / SX));
      const h = Math.max(1, Math.round(cr.height / SY));
      let d;
      try {
        if (scratch.width !== w || scratch.height !== h) { scratch.width = w; scratch.height = h; }
        sctx.imageSmoothingEnabled = false;                // nearest pixel, so colours stay exact
        sctx.clearRect(0, 0, w, h);
        sctx.drawImage(c, 0, 0, c.width, c.height, 0, 0, w, h);
        d = sctx.getImageData(0, 0, w, h).data;
      } catch { return part; }
      if (seen) seen.add(k);
      part.rows = [];
      const ys = cr.height / h;
      let run = null, miss = 0;
      for (let y = 0; y <= h; y++) {
        let n = 0, act = 0;
        if (y < h) {
          let i = y * w * 4;
          for (const end = i + w * 4; i < end; i += 4) {
            const g = d[i + 1];
            if (g < G_LO || g > G_HI) continue;
            const r = d[i], b = d[i + 2];
            if (Math.abs(r - IR) <= TOL && Math.abs(g - IG) <= TOL && Math.abs(b - IB) <= TOL) n++;
            else if (Math.abs(r - AR) <= TOL && Math.abs(g - AG) <= TOL && Math.abs(b - AB) <= TOL) { n++; act++; }
          }
        }
        // Glyphs drawn over a highlight can hide it on one sample row; only a gap of MAX_MISS+1 rows ends it,
        // else one match gave two or three ticks (53 ticks for 35 matches, measured Nov 2026, Firefox).
        if (n >= MIN_PX) { run ??= { y, act: 0 }; run.act += act; miss = 0; }
        else if (run && (++miss > MAX_MISS || y === h)) { part.rows.push({ y: from + run.y * ys, active: run.act > 0 }); run = null; miss = 0; }
      }
      return part;
    });
  }

  // Do these tiles cover the whole tab, top to bottom, with no unread stretch?
  function coversAll(sc, parts) {
    let reach = 0;
    for (const p of [...parts].sort((a, b) => a.from - b.from)) {
      if (!p.rows || p.from > reach + SLACK) return false;
      reach = Math.max(reach, p.to);
    }
    return reach >= sc.scrollHeight - 1;
  }

  // Replace what we knew about the stretches just read; keep everything else.
  function merge(list, parts) {
    const read = parts.filter(p => p.rows && p.to > p.from);
    for (const p of read) list = list.filter(r => r.y < p.from || r.y >= p.to);
    const rows = read.flatMap(p => p.rows);
    if (rows.some(r => r.active)) list.forEach(r => { r.active = false; });
    return list.concat(rows).sort((a, b) => a.y - b.y);
  }
  // After a hidden-editor sweep its rows are the positions. Rows read off the visible editor
  // while Docs is still scrolling or repainting can land up to 80 px off (measured Nov 2026,
  // Firefox), so take only "which match is current" from the visible editor.
  const ACTIVE_SNAP = 16;
  function withActive(rows, sc) {
    const out = rows.map(r => ({ y: r.y, active: false }));
    for (const a of scan(sc).flatMap(p => p.rows || []).filter(r => r.active)) {
      let best = null;
      for (const r of out) if (!best || Math.abs(r.y - a.y) < Math.abs(best.y - a.y)) best = r;
      if (best && Math.abs(best.y - a.y) <= ACTIVE_SNAP) best.active = true;
      else out.push({ y: a.y, active: true });
    }
    return out.sort((a, b) => a.y - b.y);
  }

  // ---- the shadow editor ----------------------------------------------------
  // Docs only paints the canvas near the viewport. v0.4 scrolled the visible editor
  // through the whole tab to read every match, which moved the outline highlight and
  // flashed the page. Instead, load the same doc once in a hidden, inert iframe (a
  // second editor session), run Docs' find there and scroll THAT editor. Its rows map
  // 1:1 onto the visible editor when both scrollers are the same width (measured
  // Nov 2026, Firefox: 51 of 54 rows exact, 53 within 2 px). Do not scale by the
  // scrollHeight ratio: the difference is bottom padding.
  const SHADOW_ID = 'gdocs-find-helpers-shadow';
  const SHADOW_SETTLE_MS = 600;     // scrollHeight unchanged this long = laid out
  const SHADOW_LOAD_MS = 30000;
  const HIDE_FIND = '.appsDocsUiWizFindbarCard{opacity:0!important;transform:translate(-100000px,-100000px)!important;transition:none!important;pointer-events:none!important}';
  const sh = { fr: null, sc: null, ready: false, url: '', loading: null, lock: Promise.resolve(), token: 0 };
  state.shadow = sh;
  const shadowUrl = () => location.href.replace(/#.*/, '');

  function shadowLoad() {
    if (sh.loading && sh.url === shadowUrl()) return sh.loading;
    sh.url = shadowUrl(); sh.ready = false; sh.sc = null;
    let fr = document.getElementById(SHADOW_ID);
    if (fr && fr.dataset.url !== sh.url) { fr.remove(); fr = null; }   // you moved to another document tab
    if (!fr) {
      fr = document.createElement('iframe');
      fr.id = SHADOW_ID; fr.dataset.url = sh.url;
      fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
      fr.inert = true;              // without it the iframe's find box takes focus from your editor
      Object.assign(fr.style, { position: 'fixed', left: '0', top: '0', width: innerWidth + 'px', height: innerHeight + 'px',
        opacity: '0', pointerEvents: 'none', zIndex: '-1', border: '0' });
      fr.src = sh.url;
      document.body.appendChild(fr);
    }
    sh.fr = fr;
    sh.loading = (async () => {
      const t = performance.now();
      const D = () => { try { return fr.contentDocument; } catch { return null; } };
      let sc = null, lastH = -1, since = 0;
      while (performance.now() - t < SHADOW_LOAD_MS && fr.isConnected) {
        sc ||= D() && D().querySelector('.kix-appview-editor');
        if (sc) {
          const h = sc.scrollHeight;
          if (h !== lastH) { lastH = h; since = performance.now(); }
          else if (h > sc.clientHeight && performance.now() - since > SHADOW_SETTLE_MS && tilesOf(sc).length) break;
        }
        await sleep(100);
      }
      if (!sc || !fr.isConnected) return false;
      const s = D().createElement('style'); s.textContent = HIDE_FIND; D().documentElement.appendChild(s);
      sh.sc = sc; sh.ready = true; sh.loadMs = Math.round(performance.now() - t);
      return true;
    })();
    return sh.loading;
  }
  // Loaded on the first double-click or find, not at page open: the load blocks the page for
  // about 3.5 s in bursts (measured Nov 2026, Firefox), which docs you only read should not pay.
  // That first scan falls back to the painted tiles; every later one reuses this editor.
  window.addEventListener('resize', () => { if (sh.fr) Object.assign(sh.fr.style, { width: innerWidth + 'px', height: innerHeight + 'px' }); });

  // Every match row of `word` in the whole tab, in the visible editor's scroll coordinates.
  // Returns null when the shadow editor is not ready (callers fall back to the painted tiles).
  async function shadowSweep(word, stale) {
    if (!sh.ready || sh.url !== shadowUrl() || !sh.fr.isConnected) { shadowLoad(); return null; }
    const my = ++sh.token;
    const prev = sh.lock; let release; sh.lock = new Promise(r => { release = r; });
    await prev;                     // one sweep at a time; a newer call makes this one stale
    const gone = () => my !== sh.token || stale();
    const t0 = performance.now();
    const W = sh.fr.contentWindow, D = sh.fr.contentDocument, sc = sh.sc;
    try {
      // A copy of this script without the top-window guard would sweep this frame too; park it.
      if (W.__gdocsFindHelpers) W.__gdocsFindHelpers.flow = { cancelled: true, handover: true, reason: 'shadow' };
      const card = () => D.querySelector('.appsDocsUiWizFindbarCard');
      const open = () => !!card() && W.getComputedStyle(card()).visibility === 'visible';
      const input = () => card() && card().querySelector('input[type="text"], input:not([type])');
      const counter = () => { const c = D.querySelector('.appsDocsUiWizFindbarFindInputCounter'); return c ? c.textContent : ''; };
      const fr = () => new Promise(res => { let d = false; const f = () => { if (!d) { d = true; res(); } }; W.requestAnimationFrame(f); setTimeout(f, 150); });
      if (!open()) {                // stays open between double-clicks, holding the last word
        const tef = D.querySelector('iframe.docs-texteventtarget-iframe');
        const ce = tef && tef.contentDocument.querySelector('[contenteditable]');
        if (!ce) return null;
        const mac = /Mac/.test(navigator.platform);
        ce.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'f', code: 'KeyF', keyCode: 70, which: 70,
          ctrlKey: !mac, metaKey: mac, bubbles: true, cancelable: true, composed: true }));
        const t = performance.now();
        while (!open() && performance.now() - t < OPEN_TIMEOUT_MS) { if (gone()) return null; await fr(); }
        if (!open()) return null;
      }
      const inp = input();
      if (!inp) return null;
      if (inp.value !== word) {
        const c0 = counter();
        Object.getOwnPropertyDescriptor(W.HTMLInputElement.prototype, 'value').set.call(inp, word);
        inp.dispatchEvent(new W.Event('input', { bubbles: true }));
        const t = performance.now();
        while (!(counter() !== c0 && /\d/.test(counter())) && performance.now() - t < OPEN_TIMEOUT_MS) { if (gone()) return null; await fr(); }
      }
      if (/^\s*0\b/.test(counter())) return { rows: [], complete: true, steps: 0, ms: Math.round(performance.now() - t0) };
      // The counter updates before the green is painted: a fresh query read at once misses every
      // match above the current one (measured Nov 2026, Firefox). Docs scrolls this editor to the
      // current match, so wait until the green shows there.
      for (const t = performance.now(); performance.now() - t < OPEN_TIMEOUT_MS; await fr()) {
        if (gone()) return null;
        if (scan(sc, new Set()).some(p => p.rows && p.rows.length)) break;
      }
      // Read the tab top to bottom. Nothing here is visible, so no cover and no restore.
      const seen = new Set();
      let rows = [], steps = 0, reach = 0, y = 0, complete = true;
      for (;;) {
        if (gone()) { complete = false; break; }
        if (Math.abs(sc.scrollTop - y) > 1) { sc.scrollTop = y; sc.dispatchEvent(new W.Event('scroll')); await fr(); await fr(); }
        if (gone()) { complete = false; break; }
        const parts = scan(sc, seen).sort((a, b) => a.from - b.from);
        rows = merge(rows, parts);
        steps++;
        for (const p of parts) if (p.from <= reach + SLACK && p.to > reach) reach = p.to;
        const max = sc.scrollHeight - sc.clientHeight;
        if (reach >= sc.scrollHeight - 1 || sc.scrollTop >= max - 1) break;
        if (steps > SWEEP_MAX_STEPS || performance.now() - t0 > SWEEP_MAX_MS) { complete = false; break; }
        const tileH = parts.length ? parts[0].to - parts[0].from : sc.clientHeight;
        y = Math.min(max, reach + tileH + 1);
      }
      const ms = Math.round(performance.now() - t0);
      state.lastSteps = steps; state.lastSweepMs = ms;
      if (complete) state.sweeps++;
      // Which match is "current" is the visible editor's business: the caller merges that in.
      return { rows: rows.map(r => ({ y: r.y, active: false })), complete, steps, ms };
    } finally {
      release();
    }
  }

  // ---- A. double-click a word ---------------------------------------------
  let pending = null;   // { word, t0, cancel } during the 300 ms wait

  async function closeSafely(input, opened) {
    // Never close with text in the box: Docs would select the current match.
    if (!isOpen() && opened) await waitFor(isOpen, 400);
    if (isOpen()) {
      if (input.value !== '') setValue(input, '');
      key(input, 'Escape');
      await waitFor(() => !isOpen(), OPEN_TIMEOUT_MS);
    }
  }

  // Close the bar a double-click left open (the selection collapsed, or a new double-click).
  async function release(why) {
    const k = state.kept;
    if (!k) return;
    state.kept = null;
    state.releasedBy = why;                         // for debugging from the console
    clearTicks();
    await closeSafely(findInput() || k.input, false);
    k.hide.remove();
    const ce = editor();
    if (ce && (document.activeElement !== iframe() || ce.ownerDocument.activeElement !== ce)) ce.focus();
  }
  // Is the double-clicked word no longer selected (collapsed by a click or a key, or another selection)?
  // Compare with the word, not with '': on macOS the mirror reads '' until something copies, so there
  // this must read the selection the deep way (synthetic copy) instead of trusting an empty mirror.
  const selGone = k => selText(true) !== k.word;
  // You pressed Ctrl/Cmd+F while the green shows: the bar is already open with the word; show it.
  function handOver() {
    const k = state.kept;
    if (!k) return;
    state.kept = null;
    k.hide.remove();
    state.mode = 'user';
  }

  async function runFlow(word, t0) {
    const sc = scroller(), ce = editor();
    if (!sc || !ce || isOpen()) return;
    let input = findInput();           // Docs builds the find card on first use, so this may still be null
    const f = { word, t0, cancelled: false, reason: '', marks: {}, handover: false };
    const mark = n => { f.marks[n] = Math.round(performance.now() - t0); };
    const stop = () => f.cancelled;
    state.flow = f;
    clearTicks();
    const before = { scroll: sc.scrollTop };
    const hide = hideStyle();
    let opened = false;
    mark('start');
    try {
      key(ce, 'f', FIND_MOD);
      opened = true;
      if (!await waitFor(isOpen, OPEN_TIMEOUT_MS, stop)) { f.reason ||= 'bar did not open'; return; }
      mark('opened');
      input = findInput();
      if (!input) { f.reason = 'no find input'; return; }
      const prev = input.value, cOpen = counterText();
      setValue(input, word);
      // Wait for the counter to show this query (a repeated query may not change it).
      f.counterChanged = await waitFor(() => counterText() !== cOpen && /\d/.test(counterText()), prev === word ? 150 : OPEN_TIMEOUT_MS, stop);
      mark('searched');
      f.counter = counterText();
      if (document.activeElement !== iframe() || ce.ownerDocument.activeElement !== ce) ce.focus();
      if (f.cancelled) return;
      // Ticks near the view right away; the sweep adds the rest. The green is usually painted
      // before the counter changes, but for a repeated query it can come a frame or two later.
      let first = scan(sc);
      for (f.paintFrames = 0; !first.some(p => p.rows && p.rows.length) && /[1-9]/.test(f.counter) && f.paintFrames < PAINT_FRAMES && !f.cancelled; f.paintFrames++) {
        await frame();
        first = scan(sc);
      }
      if (f.cancelled) return;
      setRows(merge([], first), 'dbl'); draw(sc);
      mark('firstTicks');
      // No matches, or a short tab that is painted top to bottom already: nothing left to sweep.
      if (/^\s*0\b/.test(f.counter) || coversAll(sc, first)) { f.sweep = { complete: true, steps: 0, ms: 0 }; mark('swept'); return; }
      const res = await shadowSweep(word, () => f.cancelled || input.value !== word);
      // Not loaded yet: keep the ticks of the tiles already painted.
      f.sweep = res ? { complete: res.complete, steps: res.steps, ms: res.ms, source: 'shadow' } : { complete: false, source: 'painted' };
      if (res && !f.handover && !f.cancelled) { setRows(withActive(res.rows, sc), 'dbl'); state.fromShadow = true; draw(sc); }
      mark('swept');
    } finally {
      if (f.handover) {
        hide.remove();
        state.mode = 'user';
      } else if (!f.cancelled && state.rows.length && isOpen() && input && input.value === word) {
        // Leave the bar open but hidden, so Docs keeps the green on every match.
        // release() closes it when the ticks go: the selection collapses or you double-click again.
        state.kept = { word, input, hide };
        if (document.activeElement !== iframe() || ce.ownerDocument.activeElement !== ce) ce.focus();
        if (sc.scrollTop !== before.scroll && !f.userScrolled) sc.scrollTop = before.scroll;
        f.kept = true;
        mark('kept');
      } else {
        mark('closing');
        input ||= findInput();
        if (input) await closeSafely(input, opened);
        hide.remove();
        ce.focus();
        if (sc.scrollTop !== before.scroll && !f.userScrolled) sc.scrollTop = before.scroll;
        mark('closed');
      }
      draw(sc);
      f.ticks = state.rows.length;
      f.after = { sel: selText(), scroll: sc.scrollTop, open: isOpen(), value: input ? input.value : null,
                  focusInEditor: document.activeElement === iframe() && ce.ownerDocument.activeElement === ce };
      if (state.flow === f) state.flow = null;
      state.lastFlow = f;
    }
  }

  // Called for every user keydown / mousedown / wheel while the flow runs or waits.
  function cancelFlow(why, e) {
    if (pending) { pending.cancel(why); pending = null; }
    const f = state.flow;
    if (!f || f.cancelled) return;
    f.cancelled = true; f.reason = why;
    if (why === 'wheel') f.userScrolled = true;
    const input = findInput();
    if (why === 'find') {
      // You pressed Ctrl/Cmd+F yourself: show the bar we already filled, and leave it open.
      f.handover = true;
      document.querySelectorAll('style').forEach(s => { if (s.textContent.startsWith('.appsDocsUiWizFindbarCard{opacity:0')) s.remove(); });
      setTimeout(() => { const i = findInput(); if (i && isOpen()) { i.focus(); i.select(); } }, PREFILL_MIN_MS);
      return;
    }
    // Empty the box now, so nothing can make Docs jump to a match before we close.
    if (input && input.value !== '') setValue(input, '');
    // A key aimed at the find box (focus has not come back yet) must not land there.
    if (e && e.type === 'keydown' && input && e.target === input) {
      e.preventDefault(); e.stopImmediatePropagation();
      editor()?.focus();
    }
  }

  function onDblClick(e) {
    if (state.flow || !e.target.closest || !e.target.closest('.kix-appview-editor')) return;
    if (isOpen() && !state.kept) return;          // your own find is open; leave it alone
    const word = selText(true);
    if (!usable(word)) return;
    const t0 = performance.now();
    if (pending) pending.cancel('replaced');
    let timer;
    const p = { word, cancel: why => { clearTimeout(timer); p.reason = why; } };
    pending = p;
    timer = setTimeout(() => {
      if (pending !== p) return;
      pending = null;
      if (selText(true) !== word) return;         // the selection grew (triple-click) or moved
      release('dblclick').then(() => runFlow(word, t0)).catch(err => console.warn('[gdocs-find-helpers]', err));
    }, DBL_WAIT_MS);
  }

  // ---- B. Ctrl/Cmd+F fills the box with your selection --------------------
  let prefillToken = 0;
  async function prefill(sel) {
    const my = ++prefillToken;
    const t0 = performance.now();
    if (!await waitFor(isOpen, OPEN_TIMEOUT_MS)) return;
    const wait = PREFILL_MIN_MS - (performance.now() - t0);
    if (wait > 0) await sleep(wait);
    if (my !== prefillToken || !isOpen()) return;
    const input = findInput();
    if (!input) return;
    const restored = input.value;
    if (restored !== sel) setValue(input, sel);
    input.focus(); input.select();
    // If Docs still writes its last query back a little later, put ours back once.
    await sleep(150);
    if (my === prefillToken && isOpen() && input.value === restored && restored !== sel) {
      setValue(input, sel); input.select();
    }
  }

  // ---- input listeners ----------------------------------------------------
  const isFindKey = e => (e.ctrlKey || e.metaKey) && !e.altKey && (e.code === 'KeyF' || (e.key || '').toLowerCase() === 'f');

  function onKeyDown(e) {
    if (selfDispatch) return;
    if (state.flow || pending) { cancelFlow(isFindKey(e) && state.flow ? 'find' : 'keydown', e); if (!isFindKey(e)) return; }
    if (!isFindKey(e)) return;
    if (state.flow && state.flow.handover) return;  // the bar is already filled with the word
    if (state.kept) handOver();
    const sel = selText(true);
    if (usable(sel)) prefill(sel);
    // Docs opens its own bar; we do not preventDefault.
  }
  function onMouseDown(e) {
    if (selfDispatch || (!state.flow && !pending)) return;
    if (track.contains(e.target)) return;
    cancelFlow(e.detail >= 3 ? 'triple-click' : 'mousedown', e);
  }
  function onWheel() { if (state.flow || pending) cancelFlow('wheel'); }
  function onSelChange() {
    // A plain click collapses the selection: the mirror goes empty right after mouseup.
    if (state.mode !== 'dbl' || state.flow || pending) return;
    if (state.kept) { if (selGone(state.kept)) release('selectionchange'); }
    else if (selText() === '') clearTicks();
  }

  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('mousedown', onMouseDown, true);
  window.addEventListener('wheel', onWheel, { capture: true, passive: true });
  document.addEventListener('dblclick', onDblClick, true);

  // The editor lives in an iframe; hook its window too (and again if Docs replaces it).
  const hooked = new WeakSet();
  function hookIframe() {
    const f = iframe();
    let w, d;
    try { w = f && f.contentWindow; d = f && f.contentDocument; } catch { return; }
    if (!w || !d || hooked.has(d)) return;
    hooked.add(d);
    w.addEventListener('keydown', onKeyDown, true);
    d.addEventListener('selectionchange', onSelChange);
  }
  hookIframe();

  // ---- C. ticks for a find you opened yourself (v0.3 loop) ----------------
  let busy = false, sweptKey = '', sweptHeight = 0, pendingKey = '', pendingAt = 0, localKey = '';

  setInterval(async () => {
    hookIframe();
    if (busy || state.flow) return;
    const sc = scroller();
    const open = isOpen();
    const inp = findInput();
    if (state.kept) {                               // our own hidden bar, not a find you opened
      if (!open) { const k = state.kept; state.kept = null; state.releasedBy = 'docs closed'; k.hide.remove(); clearTicks(); }   // Docs closed it
      else if (!pending && selGone(state.kept)) release('poll');
      return;
    }
    if (state.mode === 'dbl') {
      if (open) clearTicks();                       // you opened find yourself
      else { if (!pending && selText() === '') clearTicks(); return; }
    }
    const q = open && inp ? inp.value : '';
    if (!sc || !q) {
      if (state.mode === 'user' || !open) { if (state.mode !== 'dbl') clearTicks(); }
      sweptKey = pendingKey = localKey = '';
      return;
    }
    const m = counterText().match(/(\d+) of (\d+)/);  // "3 of 14", counted over all document tabs
    const none = !m && /\b0\b|no result/i.test(counterText());
    if (!m && !none) return;
    const total = m ? m[2] : '0';
    const tab = new URLSearchParams(location.search).get('tab') || '';
    const docKey = [q, total, tab].join('|');

    busy = true;
    try {
      if (docKey !== pendingKey) { pendingKey = docKey; pendingAt = Date.now(); }
      const heightMoved = Math.abs(sc.scrollHeight - sweptHeight) > sc.clientHeight;
      if (docKey !== sweptKey || heightMoved) {
        if (total === '0') {
          setRows([], 'user'); sweptKey = docKey; sweptHeight = sc.scrollHeight;
        } else if (Date.now() - pendingAt >= SETTLE_MS && !document.hidden) {
          const res = await shadowSweep(q, () => { const i = findInput(); return !isOpen() || !i || i.value !== q || !!state.flow; });
          if (res && res.complete && isOpen()) { setRows(withActive(res.rows, sc), 'user'); state.fromShadow = true; sweptKey = docKey; sweptHeight = sc.scrollHeight; }
          else if (isOpen()) { setRows(merge(state.rows, scan(sc)), 'user'); state.fromShadow = false; }   // shadow not ready: painted tiles only
        } else {
          await frame(); await frame();
          setRows(merge([], scan(sc)), 'user'); state.fromShadow = false;   // nearby ticks right away, the rest after the sweep
        }
        if (!isOpen()) clearTicks();
        draw(sc);
        return;
      }
      // Same query: only refresh what is on screen (stepping through matches, scrolling, edits).
      const k = [m ? m[1] : 0, Math.round(sc.scrollTop / 300)].join('|');
      if (k !== localKey) {
        localKey = k;
        await frame(); await frame();
        if (isOpen()) setRows(state.fromShadow ? withActive(state.rows, sc) : merge(state.rows, scan(sc)), 'user');
        draw(sc);
      }
    } finally {
      busy = false;
    }
  }, POLL_MS);

  window.addEventListener('resize', () => { localKey = ''; if (state.mode === 'dbl') draw(scroller()); });
})();
