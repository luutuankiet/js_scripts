async () => {
  // Close the bar without moving the selection: empty the query, then Escape.
  const gp = window.__gp; const before = gp.state();
  gp.setVal(''); gp.escFind(); await gp.sleep(300); gp.ce().focus();
  const after = gp.state(); gp.rmHide(); return {before, after};
}
