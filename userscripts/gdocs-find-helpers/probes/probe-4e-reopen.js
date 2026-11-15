async () => {
  const idoc = document.querySelector('iframe.docs-texteventtarget-iframe').contentDocument;
  const ce = idoc.querySelector('[contenteditable]');
  const selBefore = ce.textContent;
  ce.dispatchEvent(new KeyboardEvent('keydown', {key: 'f', code: 'KeyF', keyCode: 70, which: 70, ctrlKey: true, bubbles: true, cancelable: true}));
  await new Promise(r => setTimeout(r, 800));
  const card = document.querySelector('.appsDocsUiWizFindbarCard');
  const inp = document.querySelector('input[aria-label="Find in document"]');
  return JSON.stringify({selBefore, cardVisibility: getComputedStyle(card).visibility, value: inp.value, selectionStartEnd: [inp.selectionStart, inp.selectionEnd], focused: document.activeElement === inp, counter: document.querySelector('.appsDocsUiWizFindbarFindInputCounter').textContent}, null, 1);
}
