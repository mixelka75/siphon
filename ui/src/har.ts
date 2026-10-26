// Экспорт трафика в HAR или JSON (формат siphon/v1). Идентификаторы передаём в
// теле POST, потому что список может быть слишком длинным для адресной строки.
import { apiUrl, saveBlob } from './desktop';

async function downloadExport(format: 'har' | 'json', ids?: string[]) {
  const res = await fetch(apiUrl(`/api/export/${format}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ids ?? [] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  await saveBlob(blob, `siphon-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${format}`);
}

export const downloadHAR = (ids?: string[]) => downloadExport('har', ids);
export const downloadJSON = (ids?: string[]) => downloadExport('json', ids);
