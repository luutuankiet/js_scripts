async () => {
  // Q7 check: run window.findBriefly (installed by a 05-fb-* runner) and count green pixels mid-hold and after.
  const gp = window.__gp;
  const x = 1292, y = 358, t = document.elementFromPoint(x, y);
  const mo = (d, b) => ({bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: b, detail: d, view: window});
  for (const [ty, d, b] of [['mousedown',1,1],['mouseup',1,0],['click',1,0],['mousedown',2,1],['mouseup',2,0],['click',2,0],['dblclick',2,0]]) t.dispatchEvent(new MouseEvent(ty, mo(d, b)));
  await gp.sleep(200);
  const p = window.findBriefly('sync', {holdMs: 1000, close: 'clear-esc'});
  await gp.sleep(600); const mid = gp.green(64); const midActive = gp.active();
  const res = await p; const after = gp.green(64);
  return {res, midHoldGreen: mid, midActive, afterGreen: after};
}
