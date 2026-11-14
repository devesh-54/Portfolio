import fs from 'fs';
import path from 'path';

const root = process.cwd();

// 1. Audit public/ and src/assets/
const publicDir = path.join(root, 'public');
const assetsDir = path.join(root, 'src', 'assets');

function getFiles(dir) {
  const res = [];
  if (!fs.existsSync(dir)) return res;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) res.push(...getFiles(full));
    else res.push(full);
  }
  return res;
}

const publicFiles = getFiles(publicDir);
const assetFiles = getFiles(assetsDir);
const allFiles = [...publicFiles, ...assetFiles];

// Collect all text in src/ and index.html to search for references
const srcTexts = [];
function collectTexts(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'scratch'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) collectTexts(full);
    else if (/\.(ts|tsx|js|jsx|json|html|css)$/.test(e.name)) {
      srcTexts.push({ file: full, content: fs.readFileSync(full, 'utf8') });
    }
  }
}
collectTexts(path.join(root, 'src'));
if (fs.existsSync(path.join(root, 'index.html'))) {
  srcTexts.push({ file: path.join(root, 'index.html'), content: fs.readFileSync(path.join(root, 'index.html'), 'utf8') });
}

console.log('=== AUDIT OF ALL ASSETS (public/ and src/assets/) ===');
const oversized = [];
const unreferenced = [];

for (const f of allFiles) {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const stat = fs.statSync(f);
  const sizeKB = stat.size / 1024;
  const basename = path.basename(f);
  const nameNoExt = path.parse(f).name;

  // Search references
  let isReferenced = false;
  let refFoundIn = [];
  for (const st of srcTexts) {
    if (st.content.includes(basename) || st.content.includes(nameNoExt) || st.content.includes(rel.replace('public/', ''))) {
      isReferenced = true;
      refFoundIn.push(path.relative(root, st.file).replace(/\\/g, '/'));
    }
  }

  // Oversized checks
  let overInfo = null;
  const ext = path.extname(f).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) && sizeKB > 300) {
    overInfo = `Image > 300 KB (${sizeKB.toFixed(1)} KB)`;
  } else if (ext === '.glb' && sizeKB > 3072) {
    overInfo = `GLB > 3 MB (${(sizeKB / 1024).toFixed(1)} MB)`;
  }

  if (overInfo) {
    oversized.push({ rel, sizeKB, overInfo });
  }
  if (!isReferenced) {
    unreferenced.push({ rel, sizeKB });
  }

  console.log(`${rel.padEnd(45)} | ${(sizeKB).toFixed(1).padStart(8)} KB | ${isReferenced ? 'REF: ' + refFoundIn.length + ' file(s)' : 'UNREFERENCED'} ${overInfo ? ' | OVERSIZED: ' + overInfo : ''}`);
}

console.log('\n=== OVERSIZED ASSETS (' + oversized.length + ') ===');
oversized.forEach(o => console.log(` - ${o.rel} (${o.overInfo})`));

console.log('\n=== UNREFERENCED ASSETS (' + unreferenced.length + ') ===');
unreferenced.forEach(u => console.log(` - ${u.rel} (${u.sizeKB.toFixed(1)} KB)`));
