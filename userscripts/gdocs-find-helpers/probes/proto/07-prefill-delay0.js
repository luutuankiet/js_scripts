async () => {
  // Q5: capture-phase Ctrl+F listener on the iframe document; let Docs open the bar, then prefill with the selection.
  const gp = window.__gp; const DELAY = 0;
  const x = 1292, y = 358, t = document.elementFromPoint(x, y);
  const mo = (d, b) => ({bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: b, detail: d, view: window});
  for (const [ty, d, b] of [['mousedown',1,1],['mouseup',1,0],['click',1,0],['mousedown',2,1],['mouseup',2,0],['click',2,0],['dblclick',2,0]]) t.dispatchEvent(new MouseEvent(ty, mo(d, b)));
  await gp.sleep(200);
  const idoc = gp.idoc(); const inp = gp.input(); const log = []; let T0 = 0; const now = () => +(performance.now() - T0).toFixed(1);
  const priorValue = inp.value;
  let done; const finished = new Promise(r => done = r);
  const handler = (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'f') return;
    T0 = performance.now(); const sel = gp.selText(); log.push({t: 0, ev: 'keydown captured', sel, defaultPreventedYet: e.defaultPrevented});
    (async () => {
      while (DELAY >= 0 && gp.cardVis() !== 'visible' && now() < 2000) await new Promise(r => requestAnimationFrame(r));
      log.push({t: now(), ev: DELAY < 0 ? 'NOT waiting for card' : 'card visible', value: inp.value, cardVis: gp.cardVis()});
      if (DELAY > 0) await gp.sleep(DELAY);
      gp.setVal(sel); inp.select(); log.push({t: now(), ev: 'prefilled', value: inp.value, selStart: inp.selectionStart, selEnd: inp.selectionEnd});
      let last = inp.value, lastC = gp.counter();
      while (now() < 1500) { await new Promise(r => requestAnimationFrame(r));
        if (inp.value !== last) { log.push({t: now(), ev: 'VALUE CHANGED', value: inp.value}); last = inp.value; }
        if (gp.counter() !== lastC) { log.push({t: now(), ev: 'counter', counter: gp.counter()}); lastC = gp.counter(); } }
      log.push({t: now(), ev: 'end', value: inp.value, counter: gp.counter(), selStart: inp.selectionStart, selEnd: inp.selectionEnd, active: gp.active(), green: gp.green(64)});
      done();
    })();
  };
  idoc.addEventListener('keydown', handler, true);
  const k = gp.openFind();
  await finished; idoc.removeEventListener('keydown', handler, true);
  // restore: clear then Escape so the selection stays put
  gp.setVal(''); gp.escFind(); await gp.sleep(300);
  return {DELAY, priorValue, key: k, log, afterClose: {sel: gp.selText(), cardVis: gp.cardVis(), scroll: gp.scroll()}};
}
