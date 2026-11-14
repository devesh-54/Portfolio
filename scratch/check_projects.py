import re

with open('src/config/projects.ts', 'r', encoding='utf-8') as f:
    text = f.read()

items = re.findall(r'id:\s*[\'"]([^\'"]+)[\'"]\s*,.*?featured:\s*(true|false)', text, re.DOTALL)
print('Projects count:', len(items))
for item in items:
    print(item)

