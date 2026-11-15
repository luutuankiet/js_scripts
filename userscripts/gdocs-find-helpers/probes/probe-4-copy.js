() => {
  const ifr = document.querySelector('iframe.docs-texteventtarget-iframe');
  const idoc = ifr.contentDocument;
  const out = {captured: [], hasActivation: navigator.userActivation && {isActive: navigator.userActivation.isActive, hasBeenActive: navigator.userActivation.hasBeenActive}};
  const grab = (where) => (e) => {
    const d = {};
    for (const t of (e.clipboardData ? e.clipboardData.types : [])) d[t] = e.clipboardData.getData(t).slice(0, 400);
    out.captured.push({where, trusted: e.isTrusted, defaultPrevented: e.defaultPrevented, types: e.clipboardData ? [...e.clipboardData.types] : null, data: d});
  };
  const a = grab('iframeDoc-capture'), b = grab('iframeWin-bubble');
  idoc.addEventListener('copy', a, true);
  ifr.contentWindow.addEventListener('copy', b, false);
  let ret, err;
  try { ret = idoc.execCommand('copy'); } catch (e) { err = String(e); }
  idoc.removeEventListener('copy', a, true);
  ifr.contentWindow.removeEventListener('copy', b, false);
  out.execCommandReturn = ret; out.error = err;
  out.ceTextAfter = idoc.querySelector('[contenteditable]').textContent;
  return JSON.stringify(out, null, 1);
}
