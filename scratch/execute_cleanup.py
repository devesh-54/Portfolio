import os

ROOT = r'C:\Users\deves\OneDrive\project_main\Portfolio\devesh-portfolio'

files_to_delete = [
    # 1. Unused 3D Flight scene files
    'src/sections/ProjectsFlight.tsx',
    'src/sections/ProjectsFlight.css',
    'src/scenes/Projects/CardCorridor.tsx',
    'src/scenes/Projects/CardField.tsx',
    'src/scenes/Projects/CardPixelMaterial.ts',
    'src/scenes/Projects/CardStreamBridge.tsx',
    'src/scenes/Projects/DepthFlythrough.tsx',
    'src/scenes/Projects/Ground.tsx',
    'src/scenes/Projects/Objects.tsx',
    'src/scenes/Projects/PlaceholderPixelMaterial.ts',
    'src/scenes/Projects/Ps1Material.ts',
    'src/scenes/Projects/cameraHelper.ts',
    'src/config/flight.ts',
    'src/config/objects.ts',
    'src/config/ps1.ts',

    # 2. Obsolete transition components
    'src/ui/PixelFormReveal.tsx',
    'src/ui/PixelFormReveal.css',
    'src/ui/PixelBand.tsx',
    'src/ui/PixelBand.css',
    'src/ui/PixelRevealBlock.tsx',
    'src/transitions/pixelGlyphReveal.ts',
    'src/scenes/Welcome/PixelateTransitionOverlay.tsx',

    # 3. Deprecated Welcome template files
    'src/pages/Welcome.tsx',
    'src/ui/Overlay.tsx',
    'src/scenes/Welcome/Gravestone.jsx',
    'src/scenes/Welcome/RackServer.jsx',
    'src/scenes/Welcome/SketchModel.jsx',
    'src/scenes/Welcome/main.jsx',
    'src/scenes/Welcome/links.js',
    'src/scenes/Welcome/asset-credits.js',
    'src/scenes/Welcome/sketch/PaperPlane.jsx',
    'src/scenes/Welcome/sketch/SketchShadow.jsx',

    # 4. Deprecated assets and configs
    'src/App.css',
    'src/config/logos.ts',
    'src/assets/claude-code-icon.svg',
    'src/assets/fonts/Nippo-Extralight.otf',
    'src/assets/hero.png',
    'src/assets/react.svg',
    'src/assets/vite.svg',
    'src/assets/logos/firebase.svg',
    'src/assets/logos/flutter.svg',
    'src/assets/logos/github.svg',
    'src/assets/logos/python.svg',
    'src/assets/logos/react.svg',
    'src/assets/logos/supabase.svg',
    'src/assets/logos/tailwindcss.svg',
    'src/assets/projects/PLACEHOLDER_IMAGES.md',
    'src/assets/projects/cashpilot.webp',
    'src/assets/projects/chitguard.webp',
    'src/assets/projects/dr-detection.webp',
    'src/assets/projects/hireconnect.webp',
    'src/assets/projects/jeevalink.webp',
    'src/assets/projects/retinai-try.jpg',

    # 5. Unused 3D models in public
    'public/car.glb',
    'public/models/car.glb',
    'public/models/laptop.glb',
    'public/models/smartphone.glb',
]

deleted_count = 0
not_found_count = 0

for rel in files_to_delete:
    full = os.path.join(ROOT, rel.replace('/', os.sep))
    if os.path.exists(full):
        try:
            os.remove(full)
            deleted_count += 1
            print(f'Deleted: {rel}')
        except Exception as e:
            print(f'Failed to delete {rel}: {e}')
    else:
        not_found_count += 1

# Check for empty directories to clean up
for dirpath in ['src/assets/logos']:
    full_dir = os.path.join(ROOT, dirpath.replace('/', os.sep))
    if os.path.exists(full_dir) and not os.listdir(full_dir):
        os.rmdir(full_dir)
        print(f'Removed empty directory: {dirpath}')

print(f'\nCleanup finished: {deleted_count} files deleted, {not_found_count} not found.')

