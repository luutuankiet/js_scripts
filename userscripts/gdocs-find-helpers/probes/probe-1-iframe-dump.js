() => {
  const ifr = document.querySelector('iframe.docs-texteventtarget-iframe');
  const idoc = ifr.contentDocument;
  const ce = idoc.querySelector('[contenteditable]');
  return JSON.stringify({
    iframeRect: ifr.getBoundingClientRect().toJSON(),
    bodyHTML: idoc.body.innerHTML,
    ceTag: ce && ce.tagName, ceAttrs: ce && [...ce.attributes].map(a=>a.name+'='+a.value),
    ceText: ce && ce.textContent,
    iframeSel: String(idoc.getSelection()),
    topSel: String(window.getSelection()),
  }, null, 1);
}
