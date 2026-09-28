// Descobre QUAL termo do campo de altura produz o excesso de contraste na
// escala fina. A intuição dizia que era a borda do seixo; a medição diz que
// não. Então mede.
//
//   node scripts/attribute-contrast.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const TARGET = 'src/game/ground.js';
const original = readFileSync(TARGET, 'utf8');

// Cada variante zera um termo do campo de altura e mede o perfil resultante.
const variantes = [
  { nome: 'completo', de: null },
  { nome: 'sem seixos (stone+chip = 0)', de: /(\+\s*stone \* 0\.32\s*\+\s*chip \* 0\.18)/, para: '' },
  { nome: 'sem cascalho (chip = 0)', de: /\+\s*chip \* 0\.18/, para: '' },
  { nome: 'sem seixo medio (stone = 0)', de: /\+\s*stone \* 0\.32/, para: '' },
  { nome: 'sem grao (grit = 0)', de: /\+\s*grit \* 0\.02/, para: '' },
  { nome: 'sem torrões (clods = 0)', de: /clods \* 0\.56/, para: '' },
  { nome: 'sem fissuras (crack = 0)', de: /-\s*crack \* 0\.09/, para: '' }
];

function medir() {
  const saida = execFileSync(process.execPath, ['scripts/measure-floor-scales.mjs'], { encoding: 'utf8' });
  const linhas = saida.split('\n').filter((l) => /^\s+\d+\s+\d/.test(l));
  return linhas.map((l) => {
    const p = l.trim().split(/\s+/);
    return { escala: p[0], razao: parseFloat(p[3]) };
  });
}

try {
  console.log('razao de contraste por escala (referencia = 1.00)\n');
  for (const variante of variantes) {
    let codigo = original;
    if (variante.de) {
      if (!variante.de.test(codigo)) {
        console.log(`${variante.nome}: PADRAO NAO ENCONTRADO (pulando)`);
        continue;
      }
      codigo = codigo.replace(variante.de, variante.para);
      writeFileSync(TARGET, codigo);
    }

    const perfil = medir();
    const texto = perfil.map((p) => `e${p.escala}=${p.razao.toFixed(2)}`).join('  ');
    console.log(`${variante.nome.padEnd(30)} ${texto}`);
  }
} finally {
  writeFileSync(TARGET, original);
}

console.log('\nground.js restaurado ao original');
