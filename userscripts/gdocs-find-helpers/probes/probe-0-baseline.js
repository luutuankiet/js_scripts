() => {
  const ed = document.querySelector('.kix-appview-editor');
  const ifr = document.querySelector('iframe.docs-texteventtarget-iframe');
  const idoc = ifr && ifr.contentDocument;
  const tiles = document.querySelectorAll('canvas.kix-canvas-tile-content');
  return JSON.stringify({
    ua: navigator.userAgent,
    platform: navigator.platform,
    scrollTop: ed && ed.scrollTop,
    editorRect: ed && ed.getBoundingClientRect().toJSON(),
    tiles: tiles.length,
    firstTileRect: tiles[0] && tiles[0].getBoundingClientRect().toJSON(),
    iframe: !!ifr, iframeSameOrigin: !!idoc,
    iframeBodyCE: idoc && idoc.body && idoc.body.getAttribute('contenteditable'),
    iframeActive: idoc && idoc.activeElement && (idoc.activeElement.tagName + '.' + idoc.activeElement.className),
    iframeInnerHTMLlen: idoc && idoc.body && idoc.body.innerHTML.length,
    annotateFlag: window._docs_annotate_canvas_by_ext,
    svgRectAria: document.querySelectorAll('svg rect[aria-label]').length,
    kixSelectionOverlays: document.querySelectorAll('.kix-canvas-tile-selection').length,
    selectionLike: [...document.querySelectorAll('[class*="selection"]')].slice(0,20).map(e=>e.tagName+'.'+e.className),
    findInput: !!document.querySelector('input[aria-label="Find in document"]'),
    a11yScreenReader: document.querySelector('.kix-appview-editor') ? document.documentElement.getAttribute('class') : null,
    activeElement: document.activeElement && (document.activeElement.tagName + '.' + document.activeElement.className)
  }, null, 1);
}
