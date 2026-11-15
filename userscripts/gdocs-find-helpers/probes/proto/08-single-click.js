async () => {
  // Q6: does a single synthetic click collapse the selection, and which event shows it?
  const gp = window.__gp; const idoc = gp.idoc(); const log = []; let T0 = performance.now(); const now = () => +(performance.now() - T0).toFixed(1);
  const x0 = 1292, y0 = 358, t0 = document.elementFromPoint(x0, y0);
  const mo = (x, y, d, b) => ({bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: b, detail: d, view: window});
  for (const [ty, d, b] of [['mousedown',1,1],['mouseup',1,0],['click',1,0],['mousedown',2,1],['mouseup',2,0],['click',2,0],['dblclick',2,0]]) t0.dispatchEvent(new MouseEvent(ty, mo(x0, y0, d, b)));
  await gp.sleep(300);
  const selected = gp.selText();
  const onI = () => log.push({t: now(), ev: 'iframe selectionchange', text: gp.selText(), iSel: idoc.getSelection().toString()});
  const onD = () => log.push({t: now(), ev: 'top selectionchange', text: gp.selText()});
  const mut = new MutationObserver(() => log.push({t: now(), ev: 'mirror mutation', text: gp.selText()}));
  idoc.addEventListener('selectionchange', onI); document.addEventListener('selectionchange', onD);
  mut.observe(gp.ce(), {childList: true, subtree: true, characterData: true});
  const x = 1180, y = 358, t = document.elementFromPoint(x, y);
  T0 = performance.now();
  t.dispatchEvent(new MouseEvent('mousedown', mo(x, y, 1, 1))); log.push({t: now(), ev: 'after mousedown (sync)', text: gp.selText()});
  await gp.sleep(30); log.push({t: now(), ev: '30ms after mousedown', text: gp.selText()});
  t.dispatchEvent(new MouseEvent('mouseup', mo(x, y, 1, 0))); t.dispatchEvent(new MouseEvent('click', mo(x, y, 1, 0))); log.push({t: now(), ev: 'after mouseup+click (sync)', text: gp.selText()});
  await gp.sleep(300);
  idoc.removeEventListener('selectionchange', onI); document.removeEventListener('selectionchange', onD); mut.disconnect();
  return {selected, log, final: {text: gp.selText(), cursor: document.querySelector('.kix-cursor').style.cssText, scroll: gp.scroll()}};
}
