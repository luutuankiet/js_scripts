async () => {
  // Q4c: which occurrence becomes current, and where does Escape put the selection? Selection position via the inline AI bubble.
  const gp = window.__gp; const WORD = 'example', PRIOR = '';
  const bubble = () => { const b = document.querySelector('.inlineFabBubbleContainer'); if (!b) return null; const r = b.getBoundingClientRect(); return r.width ? [Math.round(r.left), Math.round(r.top)] : null; };
  const x = 1292, y = 358, t = document.elementFromPoint(x, y);
  const mo = (d, b) => ({bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: b, detail: d, view: window});
  for (const [ty, d, b] of [['mousedown',1,1],['mouseup',1,0],['click',1,0],['mousedown',2,1],['mouseup',2,0],['click',2,0],['dblclick',2,0]]) t.dispatchEvent(new MouseEvent(ty, mo(d, b)));
  await gp.sleep(400);
  const sel0 = {sel: gp.selText(), bubble: bubble()};
  gp.addHide('.appsDocsUiWizFindbarCard{opacity:0 !important;transform:translate(-100000px,-100000px) !important}');
  gp.openFind(); await gp.waitFor(() => gp.cardVis() === 'visible', 2000);
  const atOpen = {value: gp.input().value, counter: gp.counter()};
  if (PRIOR !== '__KEEP__') { gp.setVal(PRIOR); await gp.sleep(300); }
  const afterPrior = {value: gp.input().value, counter: gp.counter(), green: gp.green(64)};
  gp.setVal(WORD); await gp.sleep(400);
  const afterWord = {counter: gp.counter(), green: gp.green(64)};
  gp.escFind(); await gp.sleep(500);
  const afterEsc = {sel: gp.selText(), bubble: bubble(), scroll: gp.scroll()};
  gp.rmHide();
  return {WORD, PRIOR, sel0, atOpen, afterPrior, afterWord, afterEsc};
}
