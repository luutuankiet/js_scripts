async () => {
  const srcs = [...document.scripts].map(s => s.src).filter(Boolean);
  const hits = [];
  for (const s of srcs) {
    try {
      const t = await (await fetch(s)).text();
      for (const key of ['_docs_annotate_canvas_by_ext', '_docs_force_html_by_ext', 'docs-annotate-canvas']) {
        let i = t.indexOf(key);
        if (i >= 0) hits.push({src: s.slice(0, 120), key, ctx: t.slice(Math.max(0, i - 150), i + 200)});
      }
    } catch (e) { hits.push({src: s.slice(0,120), err: String(e)}); }
  }
  return JSON.stringify({
    nScripts: srcs.length,
    flagNow: window._docs_annotate_canvas_by_ext,
    forceHtmlNow: window._docs_force_html_by_ext,
    svgRectAria: document.querySelectorAll('svg rect[aria-label]').length,
    svgChildren: document.querySelectorAll('.kix-canvas-tile-content svg *').length,
    brailleOrSR: [...document.querySelectorAll('[aria-live]')].length,
    hits
  }, null, 1);
}
