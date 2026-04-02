import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const BASE = '/vercel/share/v0-project';
const dirs = ['components', 'app'];

// Collect all .tsx files
const files = [];
for (const dir of dirs) {
  try {
    const entries = readdirSync(join(BASE, dir));
    for (const f of entries) {
      if (f.endsWith('.tsx')) files.push(join(BASE, dir, f));
    }
  } catch { /* skip */ }
}

let totalUpdated = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  if (!content.includes('bscscan.com')) continue;

  const original = content;

  // 1. Add useChainExplorer to import
  if (!content.includes('useChainExplorer')) {
    if (content.includes('from "@/components/chain-provider"')) {
      content = content.replace(
        /import\s*\{([^}]*)\}\s*from\s*"@\/components\/chain-provider"/,
        (match, imports) => {
          return `import { ${imports.trim()}, useChainExplorer } from "@/components/chain-provider"`;
        }
      );
    } else {
      // Add entirely new import after last import
      const lines = content.split('\n');
      let lastImport = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trimStart().startsWith('import ')) lastImport = i;
      }
      if (lastImport >= 0) {
        lines.splice(lastImport + 1, 0, 'import { useChainExplorer } from "@/components/chain-provider";');
        content = lines.join('\n');
      }
    }
  }

  // 2. Add const explorer = useChainExplorer(); if not present
  if (!content.includes('const explorer = useChainExplorer()')) {
    // Try after useChainAddresses
    if (content.includes('useChainAddresses()')) {
      content = content.replace(
        /(const addresses = useChainAddresses\(\);)/,
        '$1\n  const explorer = useChainExplorer();'
      );
    }
    // Try after useChain()
    else if (content.includes('useChain()')) {
      content = content.replace(
        /(const \{[^}]*\} = useChain\(\);)/,
        '$1\n  const explorer = useChainExplorer();'
      );
    }
    // Try after useAccount()
    else if (content.includes('useAccount()')) {
      content = content.replace(
        /(const \{[^}]*\} = useAccount\(\);)/,
        '$1\n  const explorer = useChainExplorer();'
      );
    }
  }

  // 3. Replace hardcoded bscscan URLs in template literals: `https://bscscan.com/...`
  content = content.replace(/`https:\/\/bscscan\.com\//g, '`${explorer}/');

  // 4. Replace hardcoded bscscan URLs in href strings: href="https://bscscan.com/..."
  // Convert to template literal
  content = content.replace(
    /href="https:\/\/bscscan\.com\/([^"]*)"/g,
    'href={`${explorer}/$1`}'
  );

  // 5. Replace any remaining plain string https://bscscan.com
  content = content.replace(/https:\/\/bscscan\.com/g, '${explorer}');

  if (content !== original) {
    writeFileSync(file, content);
    totalUpdated++;
    console.log(`Updated: ${file}`);
  }
}

console.log(`\nDone! Updated ${totalUpdated} files.`);
