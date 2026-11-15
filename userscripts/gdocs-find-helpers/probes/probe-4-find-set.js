async () => {
  const inp = document.querySelector('input[aria-label="Find in document"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(inp, 'example');
  inp.dispatchEvent(new Event('input', {bubbles: true}));
  await new Promise(r => setTimeout(r, 800));
  // walk up to find the bar container and its text
  let bar = inp; for (let i = 0; i < 6 && bar.parentElement; i++) bar = bar.parentElement;
  const texts = [...bar.querySelectorAll('*')].filter(e => e.children.length === 0 && /\d/.test(e.textContent||'')).map(e => e.className + ' :: ' + e.textContent.trim()).slice(0, 10);
  return JSON.stringify({value: inp.value, barClass: bar.className, numericLeafTexts: texts, ariaLive: [...document.querySelectorAll('[aria-live]')].map(e => (e.textContent||'').trim()).filter(Boolean).slice(0,5)}, null, 1);
}
