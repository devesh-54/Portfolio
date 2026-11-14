import fs from 'fs';
import path from 'path';

const root = process.cwd();
const srcDir = path.join(root, 'src');

// Get all files in src
const allSrcFiles = [];
function walkSrc(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkSrc(full);
    else allSrcFiles.push(full.replace(/\\/g, '/'));
  }
}
walkSrc(srcDir);

// Map of file -> imported files
const importGraph = {};
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp'];

function resolveImport(currFile, importStr) {
  if (importStr.startsWith('.')) {
    const dir = path.dirname(currFile);
    // try exact
    let target = path.resolve(dir, importStr.replace(/(\?.*)$/, '')).replace(/\\/g, '/');
    if (fs.existsSync(target) && !fs.statSync(target).isDirectory()) return target;
    for (const ext of extensions) {
      if (fs.existsSync(target + ext)) return target + ext;
      if (fs.existsSync(path.join(target, 'index' + ext))) return path.join(target, 'index' + ext).replace(/\\/g, '/');
    }
  }
  return null;
}

for (const f of allSrcFiles) {
  importGraph[f] = new Set();
  const ext = path.extname(f);
  if (['.ts', '.tsx', '.js', '.jsx', '.css'].includes(ext)) {
    const content = fs.readFileSync(f, 'utf8');
    // regex for imports
    const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)|url\(['"]?([^'"\)]+)['"]?\)/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const imp = match[1] || match[2] || match[3];
      if (imp) {
        const resolved = resolveImport(f, imp);
        if (resolved) {
          importGraph[f].add(resolved);
        }
      }
    }
  }
}

// 1. Trace from main.tsx
const reachableFromMain = new Set();
function trace(f) {
  if (reachableFromMain.has(f)) return;
  reachableFromMain.add(f);
  const targets = importGraph[f] || [];
  for (const t of targets) trace(t);
}

const mainFile = path.join(srcDir, 'main.tsx').replace(/\\/g, '/');
trace(mainFile);

// 2. Trace reachable WITHOUT Projects.tsx
const reachablePureHome = new Set();
function traceHome(f) {
  if (f.endsWith('pages/Projects.tsx')) return;
  if (reachablePureHome.has(f)) return;
  reachablePureHome.add(f);
  const targets = importGraph[f] || [];
  for (const t of targets) traceHome(t);
}
traceHome(mainFile);

console.log('Total files in src:', allSrcFiles.length);
console.log('Reachable from main.tsx (including /projects):', reachableFromMain.size);
console.log('Reachable in pure portfolio (excluding /projects):', reachablePureHome.size);

const unreachedFromMain = allSrcFiles.filter(f => !reachableFromMain.has(f));
console.log('\n=== UNREACHED FROM MAIN.TSX AT ALL (' + unreachedFromMain.length + ') ===');
unreachedFromMain.forEach(f => console.log(' - ' + path.relative(root, f)));

const onlyInProjectsScene = allSrcFiles.filter(f => reachableFromMain.has(f) && !reachablePureHome.has(f));
console.log('\n=== REACHABLE ONLY VIA /projects ROUTE (STANDALONE LOGO SCENE) (' + onlyInProjectsScene.length + ') ===');
onlyInProjectsScene.forEach(f => console.log(' - ' + path.relative(root, f)));
