() => {
  const ifr = document.querySelector('iframe.docs-texteventtarget-iframe');
  const idoc = ifr.contentDocument;
  const ce = () => idoc.querySelector('[contenteditable]').textContent;
  window.__dbl = [];
  document.querySelector('.kix-appview-editor').addEventListener('dblclick', (e) => {
    const rec = {x: e.clientX, y: e.clientY, active: navigator.userActivation.isActive, ceSync: ce(), selSync: String(idoc.getSelection())};
    const cap = [];
    const h = (ev) => { const d = {}; for (const t of ev.clipboardData.types) d[t] = ev.clipboardData.getData(t).slice(0,400); cap.push({phase: ev.eventPhase, defaultPrevented: ev.defaultPrevented, types: [...ev.clipboardData.types], data: d}); };
    ifr.contentWindow.addEventListener('copy', h, false);
    try { rec.copyRet = idoc.execCommand('copy'); } catch (err) { rec.copyErr = String(err); }
    ifr.contentWindow.removeEventListener('copy', h, false);
    rec.copyCaptured = cap;
    setTimeout(() => { rec.ce0 = ce(); }, 0);
    setTimeout(() => { rec.ce100 = ce(); window.__dbl.push(rec); }, 100);
  }, {capture: true, once: true});
  return 'armed';
}
