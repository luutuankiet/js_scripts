() => {
  // Installs window.__gp helpers used by every later probe.
  const W = window;
  const gp = W.__gp = {};
  gp.iframe = () => document.querySelector('iframe.docs-texteventtarget-iframe');
  gp.idoc = () => gp.iframe().contentDocument;
  gp.ce = () => gp.idoc().querySelector('[contenteditable]');
  gp.selText = () => (gp.ce() ? gp.ce().textContent : null);
  gp.input = () => document.querySelector('input[aria-label="Find in document"]');
  gp.counter = () => { const c = document.querySelector('.appsDocsUiWizFindbarFindInputCounter'); return c ? c.textContent : null; };
  gp.card = () => document.querySelector('.appsDocsUiWizFindbarCard');
  gp.cardVis = () => { const c = gp.card(); return c ? getComputedStyle(c).visibility : 'absent'; };
  gp.scroller = () => document.querySelector('.kix-appview-editor');
  gp.scroll = () => gp.scroller().scrollTop;
  gp.active = () => { const a = document.activeElement; let s = a ? (a.tagName + (a.className ? '.' + String(a.className).split(' ').slice(0,2).join('.') : '') + (a.getAttribute && a.getAttribute('aria-label') ? '[' + a.getAttribute('aria-label') + ']' : '')) : null;
    if (a && a.tagName === 'IFRAME') { const ia = a.contentDocument && a.contentDocument.activeElement; s += ' > ' + (ia ? ia.tagName + (ia.isContentEditable ? '[ce]' : '') : 'null'); } return s; };
  const ACT = [109,213,140], INA = [196,238,208], TOL = 7;
  const near = (d, i, c) => Math.abs(d[i]-c[0]) <= TOL && Math.abs(d[i+1]-c[1]) <= TOL && Math.abs(d[i+2]-c[2]) <= TOL;
  gp.green = (stride = 16) => {
    let act = 0, ina = 0, ax = 0, ay = 0; const sc = document.createElement('canvas'); const ctx = sc.getContext('2d', {willReadFrequently: true});
    const vh = innerHeight;
    for (const t of document.querySelectorAll('canvas.kix-canvas-tile-content')) {
      const r = t.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh || !t.width) continue;
      sc.width = t.width; sc.height = t.height; ctx.clearRect(0,0,sc.width,sc.height); ctx.drawImage(t, 0, 0);
      const d = ctx.getImageData(0,0,sc.width,sc.height).data;
      for (let i = 0; i < d.length; i += stride) { if (near(d,i,ACT)) { act++; const px = i/4; ax += r.left + (px % sc.width) * r.width / sc.width; ay += r.top + Math.floor(px / sc.width) * r.height / sc.height; } else if (near(d,i,INA)) ina++; } // every 4th pixel
    }
    return {act, ina, activeAt: act ? [Math.round(ax/act), Math.round(ay/act)] : null};
  };
  gp.setVal = (v) => { const inp = gp.input(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(inp, v); inp.dispatchEvent(new Event('input', {bubbles: true})); };
  gp.key = (target, key, opts = {}) => { const code = key.length === 1 ? 'Key' + key.toUpperCase() : key; const kc = key === 'Escape' ? 27 : key.toUpperCase().charCodeAt(0);
    const ev = new KeyboardEvent('keydown', Object.assign({key, code, keyCode: kc, which: kc, bubbles: true, cancelable: true, composed: true}, opts));
    const ok = target.dispatchEvent(ev); return {dispatched: ok, defaultPrevented: ev.defaultPrevented}; };
  gp.openFind = () => gp.key(gp.ce(), 'f', {ctrlKey: true});
  gp.escFind = () => gp.key(gp.input(), 'Escape');
  gp.sleep = (ms) => new Promise(r => setTimeout(r, ms));
  gp.waitFor = async (fn, timeout = 3000, step = 5) => { const t0 = performance.now(); while (performance.now() - t0 < timeout) { const v = fn(); if (v) return {ok: true, ms: +(performance.now() - t0).toFixed(1), v}; await gp.sleep(step); } return {ok: false, ms: timeout}; };
  gp.state = () => ({sel: gp.selText(), scroll: gp.scroll(), cardVis: gp.cardVis(), value: gp.input() && gp.input().value, counter: gp.counter(), active: gp.active(), green: gp.green()});
  gp.addHide = (css) => { gp.rmHide(); const s = document.createElement('style'); s.id = '__gp_hide'; s.textContent = css; document.head.appendChild(s); };
  gp.rmHide = () => { const s = document.getElementById('__gp_hide'); if (s) s.remove(); };
  return gp.state();
}
