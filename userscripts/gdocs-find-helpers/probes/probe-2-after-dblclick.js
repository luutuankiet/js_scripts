() => {
  const ifr = document.querySelector('iframe.docs-texteventtarget-iframe');
  const idoc = ifr.contentDocument;
  const ce = idoc.querySelector('[contenteditable]');
  const ed = document.querySelector('.kix-appview-editor');
  const sel = idoc.getSelection();
  const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]; };
  // selection overlay candidates: any rects inside the tile svgs
  const svgKids = [...ed.querySelectorAll('svg *')].filter(n => n.tagName !== 'svg').slice(0,30).map(n => ({tag:n.tagName, cls: n.getAttribute('class'), aria: n.getAttribute('aria-label'), fill: n.getAttribute('fill'), op: n.getAttribute('fill-opacity')||n.getAttribute('opacity'), rect: r(n)}));
  return JSON.stringify({
    ceHTML: ce.innerHTML.slice(0,1000),
    ceText: ce.textContent,
    descendantHTML: idoc.getElementById('docs-texteventtarget-descendant').innerHTML.slice(0,500),
    iframeSel: String(sel), iframeSelRanges: sel.rangeCount,
    iframeSelRect: sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect().toJSON() : null,
    topSel: String(window.getSelection()),
    kixSelection: [...document.querySelectorAll('.kix-canvas-tile-selection, [class*="kix-selection"], [class*="kix-cursor"]')].slice(0,10).map(e => e.tagName+'.'+e.className+' '+JSON.stringify(r(e))),
    svgKidsCount: ed.querySelectorAll('svg *').length,
    svgKids,
    svgRectAria: document.querySelectorAll('svg rect[aria-label]').length,
    mutations: window.__probeMut.slice(0,40),
    mutIfr: window.__probeMutIfr.slice(0,20),
    events: window.__probeLog.map(e => [e.where, e.type, e.trusted, e.target, e.x, e.y, e.detail].join(' ')),
  }, null, 1);
}
