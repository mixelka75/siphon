// Начиная с Frida 17 мост к Java (глобальный `Java`) не встроен в рантайм.
// Скрипты unpinning рассчитывают на глобальный Java, поэтому собираем
// frida-java-bridge в самодостаточный IIFE и кладём перед остальными скриптами.
import { build } from 'esbuild';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '..', 'internal', 'fridascripts', 'scripts');
const outFile = path.join(outDir, 'frida-java-bridge.js');

await mkdir(outDir, { recursive: true });

await build({
    stdin: {
        contents: `import Java from 'frida-java-bridge'; globalThis.Java = Java;`,
        resolveDir: here,
        loader: 'js'
    },
    bundle: true,
    format: 'iife',
    platform: 'neutral',
    mainFields: ['module', 'main'],
    // frida-java-bridge тянет Node-овский `buffer`; в Frida для него есть свой shim
    alias: { buffer: '@frida/buffer' },
    target: 'es2022',
    legalComments: 'none',
    outfile: outFile
});

const output = await readFile(outFile, 'utf8');
if (/\brequire\(|^\s*import\s/m.test(output)) {
    throw new Error('В собранном java-bridge остались require/import — Frida такой скрипт не загрузит');
}
console.log(`✓ frida-java-bridge.js (${(output.length / 1024).toFixed(0)} KB)`);
