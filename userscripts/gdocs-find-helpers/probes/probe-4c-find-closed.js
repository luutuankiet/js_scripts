async () => {
  const inp0 = document.querySelector('input[aria-label="Find in document"]');
  const esc = new KeyboardEvent('keydown', {key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true});
  inp0.dispatchEvent(esc);
  await new Promise(r => setTimeout(r, 500));
  const card = document.querySelector('.appsDocsUiWizFindbarCard');
  const inp = document.querySelector('input[aria-label="Find in document"]');
  const afterClose = {inputExists: !!inp, inputVisible: !!(inp && inp.offsetParent), value: inp && inp.value, cardDisplay: card && getComputedStyle(card).display, cardRect: card && JSON.stringify(card.getBoundingClientRect()), counter: document.querySelector('.appsDocsUiWizFindbarFindInputCounter') && document.querySelector('.appsDocsUiWizFindbarFindInputCounter').textContent};
  let afterSet = null;
  if (inp) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(inp, 'sync');
    inp.dispatchEvent(new Event('input', {bubbles: true}));
    await new Promise(r => setTimeout(r, 800));
    afterSet = {value: inp.value, inputVisible: !!inp.offsetParent, counter: document.querySelector('.appsDocsUiWizFindbarFindInputCounter') && document.querySelector('.appsDocsUiWizFindbarFindInputCounter').textContent};
  }
  return JSON.stringify({escDefaultPrevented: esc.defaultPrevented, afterClose, afterSet}, null, 1);
}
