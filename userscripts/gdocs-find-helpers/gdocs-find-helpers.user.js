// ==UserScript==
// @name         Google Docs – find helpers
// @namespace    luutuankiet.gdocs
// @version      0.4
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
  if (window.__gdocsFindHelpers) return;

  // Colours Docs paints on the canvas for find matches (measured in Firefox, Nov 2026).
  const ACTIVE   = [109, 213, 140];  // current match, darker green
  const INACTIVE = [196, 238, 208];  // other matches, light green
  const TOL = 7;              // per-channel tolerance
  const SX = 3, SY = 2;       // read one pixel per 3x2 CSS px: plenty to spot a highlight, and fast
  const MIN_PX = 2;           // sampled pixels in a row to count as a highlight row
  const POLL_MS = 100;
  const SETTLE_MS = 200;      // wait this long after the query stops changing before sweeping
  const SWEEP_MAX_MS = 20000; // safety limit only; the double-click flow always sweeps the whole tab
  const SWEEP_MAX_STEPS = 2000;
  const SLACK = 64;           // px of gap tolerated between painted stretches (top padding, page gaps)
  const DBL_WAIT_MS = 300;    // wait for a possible third click before starting
  const PREFILL_MIN_MS = 180; // Docs restores the last query about 65 ms after Ctrl+F; fill after that
  const MAX_SEL = 100;        // longest selection we search for
  const OPEN_TIMEOUT_MS = 2000;
  const PAINT_FRAMES = 6;      // frames to wait for the green when the first look finds none

  // Docs only paints the canvas near the viewport. So after the query settles we
  // "sweep": scroll through the tab once behind a frozen picture of the page,
  // read the highlights at each stop, then put the scroll position back.
  // One stop costs two animation frames plus a few ms of reading.

  // mode: '' (no ticks), 'user' (a find you opened yourself), 'dbl' (from a double-click)
  const state = { mode: '', rows: [], sweeps: 0, lastSweepMs: 0, lastSteps: 0, flow: null, lastFlow: null };
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
  const selText   = () => { const ce = editor(); return ce ? (ce.textContent || '').trim() : ''; };
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
      let run = null;
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
        if (n >= MIN_PX) { run ??= { y, act: 0 }; run.act += act; }
        else if (run) { part.rows.push({ y: from + run.y * ys, active: run.act > 0 }); run = null; }
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

  // ---- sweep the whole tab once ------------------------------------------
  // A still picture of the page, shown while we scroll underneath it.
  function freeze(sc) {
    const tiles = tilesOf(sc);
    if (!tiles.length) return null;
    const rects = tiles.map(t => t.getBoundingClientRect());
    const sr = sc.getBoundingClientRect();
    const height = sc.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    const bg = getComputedStyle(sc).backgroundColor;
    const paper = !bg || bg === 'transparent' || /,\s*0\)$/.test(bg) ? '#fff' : bg;
    const pages = [...sc.querySelectorAll('.kix-page-paginated')].map(p => p.getBoundingClientRect());
    const pics = [...sc.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth)
      .map(i => [i, i.getBoundingClientRect()]).filter(([, r]) => r.bottom > sr.top && r.top < sr.top + height);
    const shot = (left, width, zIndex) => {
      const cv = document.createElement('canvas');
      cv.width = Math.round(width * dpr);
      cv.height = Math.round(height * dpr);
      Object.assign(cv.style, {
        position: 'fixed', left: left + 'px', top: sr.top + 'px',
        width: width + 'px', height: height + 'px', pointerEvents: 'none', zIndex,
      });
      const g = cv.getContext('2d');
      g.scale(dpr, dpr);
      g.fillStyle = paper;
      g.fillRect(0, 0, width, height);
      g.fillStyle = '#fff';
      pages.forEach(p => g.fillRect(p.left - left, p.top - sr.top, p.width, p.height));
      pics.forEach(([img, r]) => { try { g.drawImage(img, r.left - left, r.top - sr.top, r.width, r.height); } catch {} });
      tiles.forEach((t, i) => g.drawImage(t, rects[i].left - left, rects[i].top - sr.top, rects[i].width, rects[i].height));
      return [cv, g];
    };
    const left = Math.min(...rects.map(r => r.left));
    // z-index 1000: above Docs' text layer (22), below its find bar (1003)
    const [page] = shot(left, sr.right - left, 1000);
    sc.parentElement.appendChild(page);

    const bar = sc.offsetWidth - sc.clientWidth;        // 0 when the scrollbar is the overlay kind
    const w = Math.max(bar, 14);
    const [strip, g] = shot(sr.right - w, w, 2147482999);  // just under the tick strip
    if (bar > 0) {
      g.fillStyle = '#f1f1f1';
      g.fillRect(w - bar, 0, bar, height);
      g.fillStyle = '#c1c1c1';
      g.fillRect(w - bar + 2, (sc.scrollTop / sc.scrollHeight) * height, bar - 4,
                 Math.max(20, (height * height) / sc.scrollHeight));
    }
    document.documentElement.appendChild(strip);
    // Docs pops up a "17 of 25" page label whenever the document scrolls.
    const hush = document.createElement('style');
    hush.textContent = '.kix-scrollbarwidget{visibility:hidden!important}';
    document.documentElement.appendChild(hush);
    return { remove() { page.remove(); strip.remove(); hush.remove(); } };
  }

  // The sweep in progress, so an input event can put the page back at once.
  let current = null;
  function abortSweep() {
    const s = current;
    if (!s) return;
    s.aborted = true;
    s.sc.scrollTop = s.home;
    s.last = s.sc.scrollTop;
    s.cover?.remove();
  }

  // Returns { rows, complete, steps, ms }. Partial rows are returned when stale() stops it.
  async function sweep(sc, stale, seed = []) {
    const t0 = performance.now();
    const s = { sc, home: sc.scrollTop, last: sc.scrollTop, cover: null, aborted: false };
    current = s;
    s.cover = freeze(sc);
    const seen = new Set();
    let fresh = seed, complete = true, steps = 0, reach = 0, y = 0, retried = false;
    const go = async top => {
      // If Docs (new query, next match) or you moved the page meanwhile, end up there instead.
      if (Math.abs(sc.scrollTop - s.last) > 1) s.home = sc.scrollTop;
      const to = top ?? s.home;
      if (Math.abs(sc.scrollTop - to) <= 1) { s.last = sc.scrollTop; return; }   // already there: tiles are painted
      sc.scrollTop = to;
      s.last = sc.scrollTop;
      sc.dispatchEvent(new Event('scroll'));   // Docs moves its tiles right away...
      await frame(); await frame();            // ...and has repainted them two frames later.
    };
    try {
      for (;;) {
        if (s.aborted || stale()) { complete = false; break; }
        await go(y);
        if (s.aborted || stale()) { complete = false; break; }
        const parts = scan(sc, seen).sort((a, b) => a.from - b.from);
        fresh = merge(fresh, parts);
        steps++;
        const max = sc.scrollHeight - sc.clientHeight;
        // Jumped too far and left an unread stretch behind? Go back for it once.
        const gap = parts.length > 0 && parts[0].from > reach + SLACK;
        if (gap && !retried) { retried = true; y = Math.min(max, reach); continue; }
        retried = false;
        if (!parts.length) reach += sc.clientHeight;
        for (const p of parts) if (p.to > reach && (gap || p.from <= reach + SLACK)) reach = p.to;
        if (sc.scrollTop >= max - 1 || reach >= sc.scrollHeight - 1) break;
        if (performance.now() - t0 > SWEEP_MAX_MS || steps > SWEEP_MAX_STEPS) { complete = false; break; }
        // Docs paints one tile above the one at the top of the view, so aim one tile past
        // what is read: the next batch then starts exactly where this one ended.
        const tileH = parts.length ? parts[0].to - parts[0].from : 0;
        y = Math.min(max, reach + tileH + 1);
      }
    } finally {
      if (s.aborted) { sc.scrollTop = s.home; sc.dispatchEvent(new Event('scroll')); }
      else await go(null);
      s.cover?.remove();
      if (current === s) current = null;
    }
    const ms = Math.round(performance.now() - t0);
    state.lastSteps = steps; state.lastSweepMs = ms;
    if (complete) state.sweeps++;
    return { rows: fresh, complete, steps, ms };
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
      key(ce, 'f', { ctrlKey: true });
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
      const res = await sweep(sc, () => f.cancelled || input.value !== word, state.rows);
      f.sweep = { complete: res.complete, steps: res.steps, ms: res.ms };
      if (!f.handover) { setRows(res.rows, 'dbl'); draw(sc); }
      mark('swept');
    } finally {
      if (f.handover) {
        hide.remove();
        state.mode = 'user';
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
    abortSweep();
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
    if (isOpen()) return;                         // your own find is open; leave it alone
    const word = selText();
    if (!usable(word)) return;
    const t0 = performance.now();
    if (pending) pending.cancel('replaced');
    let timer;
    const p = { word, cancel: why => { clearTimeout(timer); p.reason = why; } };
    pending = p;
    timer = setTimeout(() => {
      if (pending !== p) return;
      pending = null;
      if (selText() !== word) return;             // the selection grew (triple-click) or moved
      runFlow(word, t0).catch(err => console.warn('[gdocs-find-helpers]', err));
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
    const sel = selText();
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
    if (state.mode === 'dbl' && !state.flow && !pending && selText() === '') clearTicks();
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
          const res = await sweep(sc, () => { const i = findInput(); return !isOpen() || !i || i.value !== q || !!state.flow; });
          if (res.complete && isOpen()) { setRows(res.rows, 'user'); sweptKey = docKey; sweptHeight = sc.scrollHeight; }
        } else {
          await frame(); await frame();
          setRows(merge([], scan(sc)), 'user');      // nearby ticks right away, the rest after the sweep
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
        if (isOpen()) setRows(merge(state.rows, scan(sc)), 'user');
        draw(sc);
      }
    } finally {
      busy = false;
    }
  }, POLL_MS);

  window.addEventListener('resize', () => { localKey = ''; if (state.mode === 'dbl') draw(scroller()); });
})();
