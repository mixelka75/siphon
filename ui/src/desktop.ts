interface NativeBridge {
  Connection(): Promise<string>;
  CopyText(text: string): Promise<void>;
  SaveFile(name: string, base64: string): Promise<boolean>;
}

// window.runtime — JS-рантайм Wails (есть только в нативном окне).
interface WailsRuntime { WindowShow?: () => void; WindowUnminimise?: () => void }

declare global { interface Window { go?: { main?: { Desktop?: NativeBridge } }; runtime?: WailsRuntime } }

let backend = '';
const bridge = () => window.go?.main?.Desktop;
export const apiUrl = (path: string) => backend + path;
export const isDesktop = () => !!bridge();

export async function initDesktop() {
  const native = bridge();
  if (native) backend = await native.Connection();
}

export async function nativeCopy(text: string) {
  const native = bridge();
  if (native) await native.CopyText(text);
  else await navigator.clipboard.writeText(text);
}

export async function saveBlob(blob: Blob, name: string) {
  const native = bridge();
  if (native) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    await native.SaveFile(name, btoa(binary));
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export async function saveURL(url: string, name: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await saveBlob(await res.blob(), name);
}

// Показать окно, если оно свёрнуто: ИИ-агент ждёт действий пользователя.
export function nativeAttention() {
  window.runtime?.WindowUnminimise?.();
  window.runtime?.WindowShow?.();
}
