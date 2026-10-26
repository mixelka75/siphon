// Скачивание HAR: идентификаторы передаём в теле POST, потому что список может
// быть слишком длинным для адресной строки.
import { apiUrl, saveBlob } from './desktop';
export async function downloadHAR(ids?: string[]) {
  const res = await fetch(apiUrl('/api/export/har'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ids ?? [] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  await saveBlob(blob, `siphon-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.har`);
}
