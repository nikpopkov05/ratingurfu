const r = require('./rating.json');

const sql = (r.universities || [])
  .map((u) => {
    if (!u || !u.url || !u.name) return null;
    let raw = String(u.url).trim();
    if (!raw || raw.toLowerCase() === 'null') return null;
    if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;

    let host = '';
    try {
      host = new URL(raw).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
    if (!host) return null;

    const safeName = String(u.name).replace(/'/g, "''");
    return `UPDATE pages SET university = '${safeName}' WHERE (university IS NULL OR university = '') AND url LIKE '%${host}%';`;
  })
  .filter(Boolean)
  .join('\n');

console.log(sql);
