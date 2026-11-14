import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();

// 1. File counts by type and folder tree
const exts = {};
const allFiles = [];

function walk(dir, rel = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (['node_modules', 'dist', '.git', '.cache'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) {
      walk(full, r);
    } else {
      const ext = path.extname(e.name).toLowerCase() || '(no-ext)';
      exts[ext] = (exts[ext] || 0) + 1;
      const stat = fs.statSync(full);
      allFiles.push({ path: r, size: stat.size, ext });
    }
  }
}
walk(root);

console.log('=== FILE COUNTS BY TYPE ===');
Object.entries(exts).sort((a,b) => b[1] - a[1]).forEach(([ext, count]) => {
  console.log(`${ext.padEnd(12)}: ${count}`);
});
console.log('Total files outside node_modules/dist/.git:', allFiles.length);

// 2. Tracked files by size (top 30)
console.log('\n=== TOP 30 LARGEST TRACKED FILES ===');
const lsTracked = execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const trackedSizes = [];
for (const f of lsTracked) {
  const cleanF = f.replace(/\r/g, '');
  const full = path.join(root, cleanF);
  if (fs.existsSync(full)) {
    try {
      const s = fs.statSync(full).size;
      trackedSizes.push({ path: cleanF, size: s });
    } catch (e) {}
  }
}
trackedSizes.sort((a, b) => b.size - a.size);
trackedSizes.slice(0, 30).forEach((f, i) => {
  console.log(`${String(i + 1).padStart(2)}. ${(f.size / 1024).toFixed(1).padStart(7)} KB - ${f.path}`);
});

// 3. Top 30 untracked or ignored files outside node_modules
console.log('\n=== TOP 30 LARGEST UNTRACKED / IGNORED FILES OUTSIDE NODE_MODULES ===');
const trackedSet = new Set(lsTracked.map(f => f.replace(/\r/g, '').replace(/\\/g, '/')));
const untracked = allFiles.filter(f => !trackedSet.has(f.path.replace(/\\/g, '/')));
untracked.sort((a, b) => b.size - a.size);
untracked.slice(0, 30).forEach((f, i) => {
  console.log(`${String(i + 1).padStart(2)}. ${(f.size / 1024).toFixed(1).padStart(7)} KB - ${f.path}`);
});
console.log('Total untracked/ignored outside node_modules/dist/.git:', untracked.length);
