// Paste into the console of a Google Doc in your main Firefox (top-level page, not an iframe).
// 1. Double-click a word in the document first, so it is selected. 2. Paste this, press Enter.
// Reads the selection three ways and tests which key opens the find bar. Edits nothing;
// the copy event is synthetic, so the system clipboard is not touched.
(async () => {
  const ce = document.querySelector('iframe.docs-texteventtarget-iframe').contentDocument.querySelector('[contenteditable]');
  const w = ce.ownerDocument.defaultView;
  const card = () => document.querySelector('.appsDocsUiWizFindbarCard');
  const open = () => !!card() && getComputedStyle(card()).visibility === 'visible';
  const sleep = t => new Promise(r => setTimeout(r, t));
  const out = { platform: navigator.platform, script: window.__gdocsFindHelpers ? Object.keys(window.__gdocsFindHelpers).join(',') : 'not loaded' };
  out.mirrorBefore = (ce.textContent || '').trim();
  let copied = null;
  const grab = e => { copied = e.clipboardData ? e.clipboardData.getData('text/plain') : 'no clipboardData'; };
  w.addEventListener('copy', grab);
  ce.dispatchEvent(new ClipboardEvent('copy', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true }));
  w.removeEventListener('copy', grab);
  out.copyEventText = copied;
  out.mirrorAfterCopy = (ce.textContent || '').trim();
  for (const [name, mods] of [['Ctrl+F', { ctrlKey: true }], ['Cmd+F', { metaKey: true }]]) {
    if (open()) { document.querySelector('input[aria-label="Find in document"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true })); await sleep(400); }
    ce.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: 'f', code: 'KeyF', keyCode: 70, which: 70, bubbles: true, cancelable: true }, mods)));
    let ms = -1; const t = performance.now();
    while (performance.now() - t < 4000) { if (open()) { ms = Math.round(performance.now() - t); break; } await sleep(50); }
    out[name + ' opens bar'] = ms >= 0 ? `yes, ${ms} ms` : 'no';
  }
  console.table(out);
  return out;
})();
// Expected on a Mac if the diagnosis holds: mirrorBefore "", copyEventText = your word,
// mirrorAfterCopy = your word, "Ctrl+F opens bar" no, "Cmd+F opens bar" yes.
// Close the find bar with Escape afterwards.
