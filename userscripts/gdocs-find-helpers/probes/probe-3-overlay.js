() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]; };
  const ed = document.querySelector('.kix-appview-editor');
  const stack = document.elementsFromPoint(1292, 358).map(e => e.tagName+'.'+(e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className)+' '+JSON.stringify(r(e)));
  const svgs = [...ed.querySelectorAll('svg')].slice(0,6).map(s => ({cls: s.getAttribute('class'), parentCls: s.parentElement.className, rect: r(s), kids: s.childElementCount, html: s.outerHTML.slice(0,200)}));
  // any element with selection-ish class anywhere
  const selEls = [...document.querySelectorAll('*')].filter(e => /selection|highlight/i.test(e.getAttribute('class')||'')).slice(0,30).map(e => e.tagName+'.'+e.getAttribute('class')+' '+JSON.stringify(r(e)));
  const cursor = [...document.querySelectorAll('.kix-cursor')].map(e => ({cls:e.className, style:e.getAttribute('style'), rect:r(e), caret: e.querySelector('.kix-cursor-caret') && e.querySelector('.kix-cursor-caret').getAttribute('style')}));
  return JSON.stringify({stack, svgs, selEls, cursor}, null, 1);
}
