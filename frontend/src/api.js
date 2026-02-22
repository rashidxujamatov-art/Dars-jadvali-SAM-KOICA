const BASE = 'http://localhost:3001/api';

export async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) throw await res.json();
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/pdf')) return res.blob();
  return res.json();
}
