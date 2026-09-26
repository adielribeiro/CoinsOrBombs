/**
 * Baixa as fontes do Google Fonts e embute no projeto.
 *
 * Motivo de embutir em vez de usar <link>: o jogo é instalável como PWA e
 * precisa ter cara de jogo mesmo offline, sem depender de CDN nem pagar o
 * custo de render do third-party.
 *
 * Uso: node scripts/fetch-fonts.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public', 'assets', 'fonts');

// User-Agent moderno é obrigatório: sem isso o Google devolve TTF, não WOFF2.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Só estes subsets servem: o jogo é pt-BR e o resto seria peso morto.
const WANTED_SUBSETS = new Set(['latin', 'latin-ext']);

const FAMILIES = [
  { id: 'cinzel', query: 'Cinzel:wght@600;700', file: 'cinzel' },
  { id: 'barlow', query: 'Barlow:wght@400;500;600;700', file: 'barlow' },
  { id: 'barlow-condensed', query: 'Barlow+Condensed:wght@500;600;700', file: 'barlow-condensed' },
  { id: 'plex-mono', query: 'IBM+Plex+Mono:wght@500;600', file: 'plex-mono' }
];

const faces = [];
await mkdir(outDir, { recursive: true });

for (const family of FAMILIES) {
  const res = await fetch(`https://fonts.googleapis.com/css2?family=${family.query}&display=swap`, {
    headers: { 'User-Agent': UA }
  });

  if (!res.ok) throw new Error(`${family.id}: css2 respondeu ${res.status}`);

  const css = await res.text();

  // Cada bloco @font-face do Google traz um comentário /* subset */ antes.
  const blocks = css.split('/*').slice(1);
  let kept = 0;

  for (const raw of blocks) {
    const subset = raw.slice(0, raw.indexOf('*/')).trim();

    if (!WANTED_SUBSETS.has(subset)) continue;

    const face = raw.slice(raw.indexOf('*/') + 2);
    const weight = face.match(/font-weight:\s*(\d+)/)?.[1];
    const url = face.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    const range = face.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();

    if (!weight || !url || !range) continue;

    const name = `${family.file}-${weight}-${subset}.woff2`;
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());

    await writeFile(resolve(outDir, name), bytes);
    kept += 1;

    faces.push({ family: family.id, weight, range, file: name, bytes: bytes.length });
  }

  console.log(`${family.id.padEnd(18)} ${kept} subsets`);
}

const css = `/* Gerado por scripts/fetch-fonts.mjs — não editar à mão.
   Fontes embutidas: o PWA precisa da mesma cara offline. */

${faces
  .map(
    (f) => `@font-face {
  font-family: '${f.family}';
  font-style: normal;
  font-weight: ${f.weight};
  font-display: swap;
  src: url('./fonts/${f.file}') format('woff2');
  unicode-range: ${f.range};
}`
  )
  .join('\n\n')}
`;

await writeFile(resolve(outDir, 'fonts.css'), css);

const total = faces.reduce((sum, f) => sum + f.bytes, 0);
console.log(`\n${faces.length} arquivos, ${(total / 1024).toFixed(0)} KB no total`);
