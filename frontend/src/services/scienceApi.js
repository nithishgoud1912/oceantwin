export function query(path, params = {}) {
  const search = new URLSearchParams(Object.entries(params).filter(([,v]) => v !== null && v !== undefined && v !== ''));
  return `/api/${path}${search.size ? '?' + search : ''}`;
}
export async function get(path, params = {}, signal) {
  const response = await fetch(query(path, params), { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status})`);
  return data;
}
export async function download(url, filename) {
  const response = await fetch(url);
  if (!response.ok) throw new Error((await response.json()).detail || 'Export failed');
  const blob = await response.blob(), link = document.createElement('a');
  link.href = URL.createObjectURL(blob); link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
