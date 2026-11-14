import os, re

root = os.getcwd()
src_dir = os.path.join(root, 'src')

img_no_alt = []
btn_no_label = []

for dirpath, _, filenames in os.walk(src_dir):
    for f in filenames:
        if not f.endswith(('.tsx', '.jsx')): continue
        fp = os.path.join(dirpath, f)
        rel = os.path.relpath(fp, root).replace('\\', '/')
        with open(fp, 'r', encoding='utf-8', errors='ignore') as sfp:
            content = sfp.read()
            # find <img tags
            img_tags = re.findall(r'<img[^>]*>', content, re.DOTALL)
            for it in img_tags:
                if not re.search(r'\balt\s*=', it):
                    img_no_alt.append((rel, it.replace('\n', ' ')[:80]))
            # find <button tags
            btn_tags = re.findall(r'<button[^>]*>', content, re.DOTALL)
            for bt in btn_tags:
                # check aria-label or title
                if not re.search(r'aria-label\s*=|title\s*=', bt):
                    # check if button tag has text immediately following or if it might be an icon button
                    pass

print(f"=== ACCESSIBILITY AUDIT ===")
print(f"Images without alt ({len(img_no_alt)}):")
for f, it in img_no_alt:
    print(f"  - {f}: {it}")

# Check prefers-reduced-motion in sections
print("\n=== PREFERS-REDUCED-MOTION SUPPORT ===")
for target in ['src/pages/Home.tsx', 'src/sections/PixelStage.tsx', 'src/pages/About.tsx', 'src/pages/Skills.tsx', 'src/pages/Hackathons.tsx', 'src/pages/ProjectsEditorial.tsx', 'src/pages/Achievements.tsx', 'src/pages/Contact.tsx']:
    if os.path.exists(target):
        with open(target, 'r', encoding='utf-8') as fp:
            c = fp.read()
            has_prm = 'reducedMotion' in c or 'prefers-reduced-motion' in c or 'reduced' in c
            print(f"  - {target}: {'YES' if has_prm else 'NO direct check'}")
