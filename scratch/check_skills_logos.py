import re, os

with open('src/config/skills.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# skills.ts imports logos at top
# Let's inspect imports
imports = re.findall(r"import\s+([A-Za-z0-9_]+)\s+from\s+'([^']+)'", text)
import_map = {var: path for var, path in imports}

# Find all skill entries
entries = re.findall(r"name:\s*'([^']+)'.*?logo:\s*([A-Za-z0-9_]+)", text, re.DOTALL)
print(f"Total skills matched: {len(entries)}")

real_logos = set(os.listdir('src/assets/real-logos'))
print(f"Total real logo files in src/assets/real-logos: {len(real_logos)}")

for name, logo_var in entries:
    logo_path = import_map.get(logo_var, 'NOT_IMPORTED')
    logo_file = os.path.basename(logo_path.split('?')[0])
    exists = logo_file in real_logos
    status = "OK" if exists else "MISSING"
    print(f"Skill: {name:<22} | Var: {logo_var:<15} | File: {logo_file:<18} | {status}")
