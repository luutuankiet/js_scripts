async () => {
  // runner: select my_example_word with a synthetic dblclick, then findBriefly(example, {holdMs: 800, close: 'clear-button'}) with a flash sampler
async function findBriefly(word, opts = {}) {
  // Run Docs' own find for `word` with the find card hidden, keep the green highlights
  // for holdMs, then close the bar and put things back. Page-context only; no document edits.
  const o = Object.assign({holdMs: 1500, close: 'clear-esc', timeoutMs: 2000, refocus: true}, opts);
  const T0 = performance.now(); const ms = () => +(performance.now() - T0).toFixed(1);
  const sleep = (t) => new Promise(r => setTimeout(r, t));
  const waitFor = async (fn, timeout) => { const t = performance.now(); while (performance.now() - t < timeout) { if (fn()) return true; await new Promise(r => requestAnimationFrame(r)); } return false; };
  const iframe = document.querySelector('iframe.docs-texteventtarget-iframe');
  const ce = iframe && iframe.contentDocument.querySelector('[contenteditable]');
  const input = document.querySelector('input[aria-label="Find in document"]');
  const card = document.querySelector('.appsDocsUiWizFindbarCard');
  const counterEl = () => document.querySelector('.appsDocsUiWizFindbarFindInputCounter');
  const counter = () => (counterEl() ? counterEl().textContent : null);
  const isOpen = () => !!card && getComputedStyle(card).visibility === 'visible';
  if (!ce) return {ok: false, reason: 'no editor mirror'};
  if (isOpen()) return {ok: false, reason: 'find bar already open; not touching it'};
  const scroller = document.querySelector('.kix-appview-editor');
  const before = {sel: ce.textContent, scroll: scroller.scrollTop};
  const setVal = (v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, v); input.dispatchEvent(new Event('input', {bubbles: true})); };
  const key = (target, k, extra = {}) => { const kc = k === 'Escape' ? 27 : k.toUpperCase().charCodeAt(0);
    target.dispatchEvent(new KeyboardEvent('keydown', Object.assign({key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, keyCode: kc, which: kc, bubbles: true, cancelable: true, composed: true}, extra))); };
  const marks = {};
  // 1. hide the card before it ever opens
  const style = document.createElement('style'); style.id = '__findBriefly_hide';
  style.textContent = '.appsDocsUiWizFindbarCard{opacity:0 !important;transform:translate(-100000px,-100000px) !important;transition:none !important;pointer-events:none !important}';
  document.head.appendChild(style);
  try {
    // 2. open
    key(ce, 'f', {ctrlKey: true});
    if (!await waitFor(isOpen, o.timeoutMs)) return {ok: false, reason: 'bar did not open', before};
    marks.opened = ms();
    const prevQuery = input.value;
    // 3. fill and wait for the counter to reflect the new query
    const cOpen = counter();
    setVal(word); marks.filled = ms();
    const changed = await waitFor(() => counter() !== cOpen, prevQuery === word ? 150 : o.timeoutMs);
    marks.counted = ms(); const result = counter();
    // 4. hold: give focus back to the editor so typing/shortcuts keep going to the document
    if (o.refocus) ce.focus();
    await sleep(o.holdMs); marks.held = ms();
    const selBeforeClose = ce.textContent;
    // 5. close
    if (o.close.startsWith('clear')) setVal('');   // no current match left, so closing has nothing to select
    if (o.close.endsWith('esc')) key(input, 'Escape');
    else { const btn = card.querySelector('button[aria-label="Close"]'); btn.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window})); }
    await waitFor(() => !isOpen(), o.timeoutMs); marks.closed = ms();
    if (o.refocus) ce.focus();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (scroller.scrollTop !== before.scroll) scroller.scrollTop = before.scroll;
    return {ok: true, word, result, counterChanged: changed, close: o.close, marks, totalMs: ms(), before, selBeforeClose,
      after: {sel: ce.textContent, scroll: scroller.scrollTop, value: input.value, open: isOpen(), activeIsEditor: iframe.contentDocument.activeElement === ce && document.activeElement === iframe}};
  } finally {
    style.remove();   // card is already visibility:hidden by now, so removing the hide shows nothing
  }
}
  window.findBriefly = findBriefly;
  const x = 1292, y = 358, t = document.elementFromPoint(x, y);
  const mo = (d, b) => ({bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: b, detail: d, view: window});
  for (const [ty, d, b] of [['mousedown',1,1],['mouseup',1,0],['click',1,0],['mousedown',2,1],['mouseup',2,0],['click',2,0],['dblclick',2,0]]) t.dispatchEvent(new MouseEvent(ty, mo(d, b)));
  await new Promise(r => setTimeout(r, 150));
  const card = document.querySelector('.appsDocsUiWizFindbarCard'); let run = true, flash = 0, frames = 0;
  const eff = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
  const s = () => { frames++; const r = card.getBoundingClientRect(); if (getComputedStyle(card).visibility === 'visible' && eff(card) > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight) flash++; if (run) requestAnimationFrame(s); };
  requestAnimationFrame(s);
  const res = await findBriefly('example', {holdMs: 800, close: 'clear-button'});
  await new Promise(r => setTimeout(r, 100)); run = false;
  return Object.assign(res, {frames, flashFrames: flash});
}
