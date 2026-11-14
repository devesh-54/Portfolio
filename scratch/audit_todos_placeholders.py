import os, re

root = os.getcwd()
patterns = [
    (r'\bTODO\b', 'TODO'),
    (r'\bFIXME\b', 'FIXME'),
    (r'\bXXX\b', 'XXX'),
    (r'your\.email', 'your.email'),
    (r'example\.com', 'example.com'),
    (r'\bLorem\b', 'Lorem'),
    (r'\bpicsum\b', 'picsum'),
    (r'\bplaceholder\b', 'placeholder'),
    (r'TODO\s+confirm', 'TODO confirm'),
]

results = []

def scan_file(filepath):
    rel = os.path.relpath(filepath, root).replace('\\', '/')
    if any(p in rel for p in ['node_modules/', 'dist/', '.git/', 'scratch/']):
        return
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for idx, line in enumerate(f, 1):
                # skip pure comments discussing placeholder in generic text if needed, but let's record everything
                for pat, label in patterns:
                    if re.search(pat, line, re.IGNORECASE):
                        results.append({
                            'file': rel,
                            'line': idx,
                            'pattern': label,
                            'text': line.strip()
                        })
                        break
    except Exception as e:
        pass

for dirpath, dirnames, filenames in os.walk(root):
    for f in filenames:
        scan_file(os.path.join(dirpath, f))

print(f"Total matching lines found: {len(results)}\n")
for r in results:
    print(f"{r['file']}:{r['line']} [{r['pattern']}] -> {r['text'][:120]}")

