import os, re, subprocess

root = os.getcwd()
src_dir = os.path.join(root, 'src')

# 1. TypeScript checks: any, ts-ignore, ts-nocheck, jsx files
any_count = 0
any_locations = []
ts_ignore_count = 0
ts_ignore_locations = []
ts_nocheck_count = 0
ts_nocheck_locations = []
jsx_files = []
console_logs = []

for dirpath, _, filenames in os.walk(src_dir):
    for f in filenames:
        rel = os.path.relpath(os.path.join(dirpath, f), root).replace('\\', '/')
        ext = os.path.splitext(f)[1]
        if ext in ['.jsx', '.js']:
            jsx_files.append(rel)
        if ext in ['.ts', '.tsx', '.js', '.jsx']:
            with open(os.path.join(dirpath, f), 'r', encoding='utf-8', errors='ignore') as fp:
                for idx, line in enumerate(fp, 1):
                    if re.search(r'\bas\s+any\b|:\s*any\b', line):
                        any_count += 1
                        any_locations.append(f"{rel}:{idx}")
                    if '@ts-ignore' in line:
                        ts_ignore_count += 1
                        ts_ignore_locations.append(f"{rel}:{idx}")
                    if '@ts-nocheck' in line:
                        ts_nocheck_count += 1
                        ts_nocheck_locations.append(f"{rel}:{idx}")
                    if re.search(r'console\.(log|debug|info)\(', line):
                        console_logs.append(f"{rel}:{idx} -> {line.strip()[:100]}")

print(f"=== TYPESCRIPT & CODE CHECKS ===")
print(f"Total 'any' uses: {any_count}")
print(f"Total @ts-ignore: {ts_ignore_count}")
print(f"Total @ts-nocheck: {ts_nocheck_count}")
print(f"JSX / JS files bypassing typecheck ({len(jsx_files)}):")
for jf in jsx_files:
    print(f"  - {jf}")

print(f"\nTotal console.log/debug calls: {len(console_logs)}")
for cl in console_logs[:15]:
    print(f"  - {cl}")
if len(console_logs) > 15:
    print(f"  ... and {len(console_logs) - 15} more")

# 2. Security audit: scan git history and repo for secrets
print("\n=== SECURITY AUDIT ===")
patterns = [
    (r'AIza[0-9A-Za-z-_]{35}', 'Google API Key'),
    (r'sk-[0-9A-Za-z-_]{20,}', 'OpenAI API Key'),
    (r'ghp_[0-9A-Za-z]{36}', 'GitHub Token'),
    (r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', 'Private Key'),
    (r'(?:api[_-]?key|secret|token|password)\s*[:=]\s*[\'"][^\'"]+[\'"]', 'Potential Secret Key/Token/Password'),
]

found_secrets = []
for dirpath, _, filenames in os.walk(root):
    if any(p in dirpath for p in ['node_modules', 'dist', '.git', 'scratch']):
        continue
    for f in filenames:
        fp = os.path.join(dirpath, f)
        rel = os.path.relpath(fp, root).replace('\\', '/')
        try:
            with open(fp, 'r', encoding='utf-8', errors='ignore') as sfp:
                for idx, line in enumerate(sfp, 1):
                    for pat, label in patterns:
                        if re.search(pat, line, re.IGNORECASE):
                            found_secrets.append(f"{rel}:{idx} [{label}]")
        except Exception:
            pass

print(f"Secrets found in repo files: {len(found_secrets)}")
for s in found_secrets:
    print(f"  - {s}")

# Check personal data: phone number, email
print("\n=== PERSONAL DATA CHECK ===")
p_patterns = [
    (r'\+91[0-9\s-]{10,}', 'Phone Number'),
    (r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', 'Email Address')
]
personal_data = []
for dirpath, _, filenames in os.walk(src_dir):
    for f in filenames:
        fp = os.path.join(dirpath, f)
        rel = os.path.relpath(fp, root).replace('\\', '/')
        with open(fp, 'r', encoding='utf-8', errors='ignore') as sfp:
            for idx, line in enumerate(sfp, 1):
                for pat, label in p_patterns:
                    m = re.findall(pat, line)
                    if m:
                        for match in m:
                            personal_data.append(f"{rel}:{idx} [{label}]: {match}")

for pd in personal_data:
    print(f"  - {pd}")

