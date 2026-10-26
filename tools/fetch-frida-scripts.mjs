// Скачивает Frida-скрипты unpinning/interception от HTTP Toolkit (AGPL-3.0)
// в internal/fridascripts/scripts. Версия зафиксирована коммитом, чтобы сборка
// была воспроизводимой. Чтобы обновить скрипты — поменяйте COMMIT.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'httptoolkit/frida-interception-and-unpinning';
const COMMIT = '560dd29d410fe785f9f390e3c7f86ca8359c8d67';

const FILES = [
    'LICENSE',
    'config.js',
    'native-connect-hook.js',
    'native-tls-hook.js',
    'android/android-proxy-override.js',
    'android/android-system-certificate-injection.js',
    'android/android-certificate-unpinning.js',
    'android/android-certificate-unpinning-fallback.js',
    'android/android-disable-root-detection.js',
    'android/android-disable-flutter-certificate-pinning.js',
    'utilities/test-ip-connectivity.js'
];

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '..', 'internal', 'fridascripts', 'scripts');

for (const file of FILES) {
    const url = `https://raw.githubusercontent.com/${REPO}/${COMMIT}/${file}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Не удалось скачать ${file}: HTTP ${res.status}`);
    const dest = path.join(outDir, file);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    console.log('✓', file);
}

await writeFile(path.join(outDir, 'SOURCE.md'), [
    '# Frida interception & unpinning scripts',
    '',
    `Источник: https://github.com/${REPO} @ ${COMMIT}`,
    'Лицензия: AGPL-3.0-or-later (см. LICENSE в этой папке).',
    '',
    'Файлы скачаны скриптом `tools/fetch-frida-scripts.mjs` без изменений.',
    'Если вы распространяете Siphon вместе с этими скриптами, условия AGPL-3.0 действуют на них.',
    ''
].join('\n'));
console.log(`Готово: ${outDir}`);
