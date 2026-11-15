async () => {
  const s = [...document.scripts].map(s => s.src).find(u => u.includes('docs.client_js_prod'));
  const t = await (await fetch(s)).text();
  const out = [];
  for (const key of ['LVf()', 'KVf(', 'kix-ealct']) {
    let i = -1, n = 0;
    while ((i = t.indexOf(key, i + 1)) >= 0 && n < 6) { out.push({key, ctx: t.slice(Math.max(0, i - 160), i + 160)}); n++; }
  }
  return JSON.stringify(out, null, 1);
}
