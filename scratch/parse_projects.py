import re

with open('src/config/projects.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Find project blocks
blocks = text.split("id: '")
for b in blocks[1:]:
    pid = b.split("'")[0]
    title_m = re.search(r"title:\s*'([^']+)'", b)
    title = title_m.group(1) if title_m else 'UNKNOWN'
    img_m = re.search(r"image:\s*([^\n,]+)", b)
    img = img_m.group(1).strip() if img_m else 'NONE'
    gallery_m = re.search(r"gallery:\s*\[(.*?)\]", b, re.DOTALL)
    gallery = gallery_m.group(1).strip().replace('\n', ' ') if gallery_m else 'NONE'
    print(f"Project: {pid:<15} | Title: {title:<25} | Image: {img}")
    print(f"   Gallery: {gallery}")
