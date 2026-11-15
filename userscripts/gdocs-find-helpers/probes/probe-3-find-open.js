() => {
  const ifr = document.querySelector('iframe.docs-texteventtarget-iframe');
  const idoc = ifr.contentDocument;
  const ce = idoc.querySelector('[contenteditable]');
  const before = {findInput: !!document.querySelector('input[aria-label="Find in document"]'), sel: ce.textContent};
  const ev = new KeyboardEvent('keydown', {key: 'f', code: 'KeyF', keyCode: 70, which: 70, ctrlKey: true, bubbles: true, cancelable: true});
  const notCancelled = ce.dispatchEvent(ev);
  return JSON.stringify({before, dispatchedTo: 'iframe contenteditable', notCancelled, defaultPrevented: ev.defaultPrevented});
}
