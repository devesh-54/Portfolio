import os
import re
import json

ROOT = r'C:\Users\deves\OneDrive\project_main\Portfolio\devesh-portfolio'
SRC = os.path.join(ROOT, 'src')

# 1. Collect all files in src
all_src_files = set()
for root, dirs, files in os.walk(SRC):
    for f in files:
        full_path = os.path.normpath(os.path.join(root, f))
        rel_path = os.path.relpath(full_path, ROOT).replace('\\', '/')
        all_src_files.add(rel_path)

# 2. Dependency tracer starting from entry points
entry_points = ['src/main.tsx', 'index.html']
visited = set()
to_visit = list(entry_points)

extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.otf', '.ttf', '.woff', '.woff2']

def resolve_import(curr_file, import_str):
    if import_str.startswith('.'):
        curr_dir = os.path.dirname(curr_file)
        base = os.path.normpath(os.path.join(curr_dir, import_str)).replace('\\', '/')
        for ext in extensions:
            cand = base + ext
            if cand in all_src_files:
                return cand
            idx_cand = (base + '/index' + ext).replace('\\', '/')
            if idx_cand in all_src_files:
                return idx_cand
    elif import_str.startswith('/src/'):
        base = import_str.lstrip('/')
        for ext in extensions:
            cand = base + ext
            if cand in all_src_files:
                return cand
    return None

import_regex = re.compile(r"""(?:from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]|src\s*=\s*['"]([^'"]+)['"]|href\s*=\s*['"]([^'"]+)['"])""")
url_regex = re.compile(r"""url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)""")

while to_visit:
    curr = to_visit.pop(0)
    if curr in visited:
        continue
    visited.add(curr)
    
    full_path = os.path.join(ROOT, curr)
    if not os.path.exists(full_path):
        continue
    
    if any(curr.endswith(ext) for ext in ['.ts', '.tsx', '.js', '.jsx', '.css', '.html']):
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            for m in import_regex.finditer(content):
                target = next(g for g in m.groups() if g is not None)
                res = resolve_import(curr, target)
                if res and res not in visited and res not in to_visit:
                    to_visit.append(res)
            
            for m in url_regex.finditer(content):
                target = m.group(1)
                res = resolve_import(curr, target)
                if res and res not in visited and res not in to_visit:
                    to_visit.append(res)
        except Exception:
            pass

unused_in_src = sorted(list(all_src_files - visited))
used_in_src = sorted(list(visited & all_src_files))

print(f'TOTAL FILES IN SRC: {len(all_src_files)}')
print(f'ACTIVE / REQUIRED IN SRC: {len(used_in_src)}')
print(f'UNUSED / ORPHAN IN SRC: {len(unused_in_src)}')

print('\n=== UNUSED / ORPHAN FILES IN SRC ===')
for u in unused_in_src:
    print(u)

# Also check public directory
PUBLIC = os.path.join(ROOT, 'public')
all_public_files = []
for root, dirs, files in os.walk(PUBLIC):
    for f in files:
        full_path = os.path.normpath(os.path.join(root, f))
        rel_path = os.path.relpath(full_path, ROOT).replace('\\', '/')
        all_public_files.append(rel_path)

print(f'\nTOTAL FILES IN PUBLIC: {len(all_public_files)}')
for p in all_public_files:
    print(p)

# Also check scratch directory
SCRATCH = os.path.join(ROOT, 'scratch')
all_scratch_files = []
if os.path.exists(SCRATCH):
    for f in os.listdir(SCRATCH):
        all_scratch_files.append(f'scratch/{f}')
print(f'\nTOTAL FILES IN SCRATCH (Temporary test/QA scripts): {len(all_scratch_files)}')

