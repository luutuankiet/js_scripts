() => {
  const card = document.querySelector('.appsDocsUiWizFindbarCard');
  const inp = document.querySelector('input[aria-label="Find in document"]');
  const cs = card && getComputedStyle(card);
  let p = card, hiddenAncestor = null;
  while (p) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') { hiddenAncestor = p.tagName + '.' + p.className + ' display=' + s.display + ' vis=' + s.visibility + ' op=' + s.opacity; break; } p = p.parentElement; }
  const idoc = document.querySelector('iframe.docs-texteventtarget-iframe').contentDocument;
  return JSON.stringify({
    cardRect: card && JSON.stringify(card.getBoundingClientRect()), cardOpacity: cs && cs.opacity, cardVisibility: cs && cs.visibility,
    hiddenAncestor, inputValue: inp && inp.value, activeIsInput: document.activeElement === inp,
    activeEl: document.activeElement.tagName + '.' + document.activeElement.className,
    counter: document.querySelector('.appsDocsUiWizFindbarFindInputCounter') && document.querySelector('.appsDocsUiWizFindbarFindInputCounter').textContent,
    mirror: idoc.querySelector('[contenteditable]').textContent,
    speakableTail: document.getElementById('docs-aria-speakable').textContent.slice(-160)
  }, null, 1);
}
