async () => {
  // Q4b: close with the find card's close button (synthetic click), record the same state as Escape.
  const gp = window.__gp; const card = gp.card();
  const btns = [...card.querySelectorAll('button,[role=button]')].map(b => ({tag: b.tagName, label: b.getAttribute('aria-label'), cls: String(b.className).slice(0, 60)}));
  const btn = [...card.querySelectorAll('button,[role=button]')].find(b => /close/i.test(b.getAttribute('aria-label') || ''));
  const before = gp.state();
  let how = null;
  if (btn) { const r = btn.getBoundingClientRect(); const o = {bubbles: true, cancelable: true, composed: true, clientX: r.left + r.width/2, clientY: r.top + r.height/2, button: 0, view: window};
    btn.dispatchEvent(new PointerEvent('pointerdown', o)); btn.dispatchEvent(new MouseEvent('mousedown', o)); btn.dispatchEvent(new PointerEvent('pointerup', o)); btn.dispatchEvent(new MouseEvent('mouseup', o)); btn.dispatchEvent(new MouseEvent('click', o)); how = 'synthetic pointer+mouse+click'; }
  await gp.sleep(300);
  const after = gp.state(); gp.rmHide();
  return {btns, closeLabel: btn && btn.getAttribute('aria-label'), how, before, after};
}
