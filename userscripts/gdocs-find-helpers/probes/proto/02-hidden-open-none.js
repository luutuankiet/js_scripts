async () => {
  // Q1+Q2+Q3: hide the card with METHOD, open with Ctrl+F, fill WORD, measure counter, green, focus, selection.
  const gp = window.__gp; const METHOD = 'none', WORD = 'sync';
  const CSS = {
    opacity: '.appsDocsUiWizFindbarCard{opacity:0 !important;transition:none !important}',
    transform: '.appsDocsUiWizFindbarCard{transform:translate(-100000px,-100000px) !important;transition:none !important}',
    ancestor: ':has(> .appsDocsUiWizFindbarCard){visibility:hidden !important}',
    none: ''
  }[METHOD];
  const before = gp.state();
  if (CSS) gp.addHide(CSS);
  // frame sampler: is the card actually painted on screen in any frame?
  const frames = []; let run = true;
  const effOpacity = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
  const sample = () => { const c = gp.card(); if (c) { const r = c.getBoundingClientRect(); const onScreen = r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight && r.width > 0;
      const vis = getComputedStyle(c).visibility; const op = effOpacity(c); frames.push({t: +performance.now().toFixed(0), vis, op: +op.toFixed(2), onScreen, x: Math.round(r.left), y: Math.round(r.top)}); }
    if (run) requestAnimationFrame(sample); };
  requestAnimationFrame(sample);
  const tOpen = performance.now();
  const key = gp.openFind();
  const shown = await gp.waitFor(() => gp.cardVis() === 'visible', 2000, 2);
  const afterOpen = {active: gp.active(), sel: gp.selText(), value: gp.input().value, counter: gp.counter(), scroll: gp.scroll()};
  const counterBefore = gp.counter();
  let tCounter = null, tGreen = null, polls = 0, greenCostMs = 0;
  const cEl = document.querySelector('.appsDocsUiWizFindbarFindInputCounter');
  const mo = new MutationObserver(() => { if (tCounter === null && gp.counter() !== counterBefore) tCounter = +(performance.now() - t0).toFixed(1); });
  mo.observe(cEl, {childList: true, subtree: true, characterData: true});
  const t0 = performance.now(); gp.setVal(WORD);
  const tSync = gp.counter() !== counterBefore ? +(performance.now() - t0).toFixed(1) : null;
  while (performance.now() - t0 < 3000 && tGreen === null) {
    const g0 = performance.now(); const g = gp.green(1024); greenCostMs = +(performance.now() - g0).toFixed(1); if (g.act + g.ina > 0) tGreen = +(performance.now() - t0).toFixed(1);
    polls++; await gp.sleep(1);
  }
  mo.disconnect();
  await gp.sleep(200);
  const afterFill = gp.state();
  // Q3: refocus the iframe contenteditable; does green and selection stay?
  gp.ce().focus();
  await gp.sleep(300);
  const afterRefocus = gp.state();
  run = false;
  const painted = frames.filter(f => f.vis === 'visible' && f.op > 0 && f.onScreen);
  return {METHOD, WORD, key, shownMs: shown.ms, openToShownMs: +(shown.ok ? performance.now() - tOpen : -1).toFixed(0), before, afterOpen, counterBefore, tSync, tCounter, tGreen, polls, greenCostMs, afterFill, afterRefocus,
    frames: frames.length, framesVisibleOnScreen: painted.length, firstPainted: painted[0] || null, sampleFrames: frames.filter((f, i) => i < 3 || i === frames.length - 1)};
}
