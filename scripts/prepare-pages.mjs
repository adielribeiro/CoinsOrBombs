/**
 * Copia o build de produção para docs/game, que é o que o GitHub Pages serve.
 *
 * Existe como script (e não como passo solto no workflow) para que o
 * resultado seja reproduzível localmente: `npm run build && npm run pages`.
 */
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const target = resolve(root, 'docs', 'game');

if (!existsSync(dist)) {
  console.error('dist/ não existe. Rode `npm run build` antes de `npm run pages`.');
  process.exit(1);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(dist, target, { recursive: true });

// O manifest precisa de um start_url relativo ao próprio jogo, senão a PWA
// abre a landing page ao ser instalada de dentro de /game/.
const manifestPath = resolve(target, 'manifest.webmanifest');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.start_url = './';
manifest.scope = './';
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

// O harness de captura de tela é local de desenvolvimento.
await rm(resolve(target, '__shot.html'), { force: true });

console.log(`docs/game pronto (${target})`);
