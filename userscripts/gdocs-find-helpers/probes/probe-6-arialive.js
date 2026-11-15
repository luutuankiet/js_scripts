() => {
  return JSON.stringify([...document.querySelectorAll('[aria-live]')].map(e => ({
    tag: e.tagName, id: e.id, cls: e.className, role: e.getAttribute('role'), live: e.getAttribute('aria-live'),
    children: e.childElementCount, tail: (e.textContent||'').slice(-200)
  })).filter(x => x.tail.trim()), null, 1);
}
