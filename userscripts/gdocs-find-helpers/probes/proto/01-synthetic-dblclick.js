async () => {
  // Try to make a selection with a synthetic mouse sequence at a word position.
  const gp = window.__gp; const x = 1292, y = 358;
  const target = document.elementFromPoint(x, y);
  const before = gp.selText();
  const opts = (d, b) => ({bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, screenX: x, screenY: y + 80, button: 0, buttons: b, detail: d, view: window});
  const fire = (t, type, d, b) => t.dispatchEvent(new MouseEvent(type, opts(d, b)));
  fire(target, 'mousedown', 1, 1); fire(target, 'mouseup', 1, 0); fire(target, 'click', 1, 0);
  fire(target, 'mousedown', 2, 1); fire(target, 'mouseup', 2, 0); fire(target, 'click', 2, 0); fire(target, 'dblclick', 2, 0);
  await gp.sleep(150);
  return {target: target.tagName + '.' + target.className, before, after: gp.selText(), scroll: gp.scroll(), cursor: (document.querySelector('.kix-cursor')||{}).style ? document.querySelector('.kix-cursor').style.cssText : null};
}
