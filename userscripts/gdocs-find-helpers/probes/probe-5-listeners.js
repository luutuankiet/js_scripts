() => {
  window.__probeLog = [];
  const log = (where, e) => window.__probeLog.push({where, type: e.type, trusted: e.isTrusted,
    target: e.target && (e.target.tagName||e.target.nodeName) + '.' + (e.target.className||''),
    x: e.clientX, y: e.clientY, detail: e.detail,
    clip: e.clipboardData ? Object.fromEntries((e.clipboardData.types||[]).map(t=>[t, e.clipboardData.getData(t).slice(0,300)])) : undefined});
  const ifr = document.querySelector('iframe.docs-texteventtarget-iframe');
  const idoc = ifr.contentDocument;
  const ed = document.querySelector('.kix-appview-editor');
  const types = ['dblclick','click','mousedown','mouseup','selectionchange','copy','beforecopy','keydown','beforeinput','input'];
  for (const t of types) {
    window.addEventListener(t, e=>log('window', e), true);
    document.addEventListener(t, e=>log('document', e), true);
    ed.addEventListener(t, e=>log('editor', e), true);
    idoc.addEventListener(t, e=>log('iframeDoc', e), true);
    ifr.contentWindow.addEventListener(t, e=>log('iframeWin', e), true);
  }
  window.__probeMut = [];
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType===1) window.__probeMut.push(n.tagName+'.'+(n.className&&n.className.baseVal!==undefined?n.className.baseVal:n.className)); }).observe(ed, {childList:true, subtree:true});
  window.__probeMutIfr = [];
  new MutationObserver(ms => { for (const m of ms) window.__probeMutIfr.push(m.type+':'+(m.target.nodeName)+':'+[...m.addedNodes].map(n=>n.nodeName+'='+(n.textContent||'').slice(0,80)).join('|')); }).observe(idoc.body, {childList:true, subtree:true, characterData:true});
  return 'installed on ' + types.join(',');
}
