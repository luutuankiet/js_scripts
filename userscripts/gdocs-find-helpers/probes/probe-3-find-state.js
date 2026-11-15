() => {
  const inp = document.querySelector('input[aria-label="Find in document"]');
  const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]; };
  const box = inp && inp.closest('[role="dialog"], .docs-findinput-container, .docs-findandreplacebar, div');
  const countEl = document.querySelector('.docs-findinput-count');
  return JSON.stringify({
    exists: !!inp, value: inp && inp.value, rect: inp && r(inp),
    visible: inp && inp.offsetParent !== null,
    focused: document.activeElement === inp,
    countText: countEl && countEl.textContent,
    countCandidates: [...document.querySelectorAll('[class*="findinput"], [class*="find-"]')].slice(0,15).map(e => e.className + ' :: ' + (e.textContent||'').slice(0,40)),
  }, null, 1);
}
