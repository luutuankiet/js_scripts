async () => {
  // Close with Escape on the input; record selection, scroll, green, value, card.
  const gp = window.__gp; const before = gp.state();
  const k = gp.escFind(); await gp.sleep(300);
  const after = gp.state(); gp.rmHide();
  return {k, before, after};
}
