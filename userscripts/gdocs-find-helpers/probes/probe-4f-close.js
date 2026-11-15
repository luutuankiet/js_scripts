async () => {
  const inp = document.querySelector('input[aria-label="Find in document"]');
  inp.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true}));
  await new Promise(r => setTimeout(r, 500));
  const idoc = document.querySelector('iframe.docs-texteventtarget-iframe').contentDocument;
  return JSON.stringify({cardVisibility: getComputedStyle(document.querySelector('.appsDocsUiWizFindbarCard')).visibility, value: inp.value, mirror: idoc.querySelector('[contenteditable]').textContent});
}
