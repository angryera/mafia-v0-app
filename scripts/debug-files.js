import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const BASE = '/vercel/share/v0-project';
const dir = join(BASE, 'components');
const entries = readdirSync(dir);
console.log(`Found ${entries.length} entries in components/`);
const tsxFiles = entries.filter(f => f.endsWith('.tsx'));
console.log(`TSX files: ${tsxFiles.length}`);

let withBsc = 0;
for (const f of tsxFiles) {
  const content = readFileSync(join(dir, f), 'utf8');
  if (content.includes('bscscan.com')) {
    console.log(`HAS bscscan: ${f}`);
    withBsc++;
  }
}
console.log(`Files with bscscan: ${withBsc}`);
