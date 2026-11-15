async () => {
  // Cleanup: single click near the original caret to collapse the selection; verify bar closed, no hide style, scroll.
  const gp = window.__gp; const x = 1290, y = 358, t = document.elementFromPoint(x, y);
  const mo = (d, b) => ({bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: b, detail: d, view: window});
  for (const [ty, d, b] of [['mousedown',1,1],['mouseup',1,0],['click',1,0]]) t.dispatchEvent(new MouseEvent(ty, mo(d, b)));
  await gp.sleep(300);
  if (gp.scroll() !== 0) gp.scroller().scrollTop = 0;
  const hideStyles = document.querySelectorAll('#__gp_hide,#__findBriefly_hide').length;
  return Object.assign(gp.state(), {hideStyles, cursor: document.querySelector('.kix-cursor').style.cssText});
}
